/* global __XKEY_INTEGRITY_PUBLIC_KEY__ */

const textEncoder = new TextEncoder();
const INTEGRITY_SOURCE = 'github.com/haivcon/xKey';
const INTEGRITY_TIMEOUT_MS = 10000;
const INTEGRITY_PUBLIC_KEY_PEM = __XKEY_INTEGRITY_PUBLIC_KEY__;

const toHex = (bytes) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const fromBase64 = (value) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const pemToBytes = (pem) => {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
  return fromBase64(base64);
};

export const createIntegrityError = (code, message) => {
  const error = new Error(`[${code}] ${message} Official source: ${INTEGRITY_SOURCE}`);
  error.code = code;
  return error;
};

const getCrypto = () => {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle || typeof crypto.getRandomValues !== 'function') {
    throw createIntegrityError('CRYPTO_RUNTIME_UNAVAILABLE', 'WebCrypto runtime is unavailable.');
  }
  return crypto;
};

const assertEqual = (name, actual, expected, code) => {
  if (actual !== expected) {
    throw createIntegrityError(code, `${name} known-answer test failed.`);
  }
};

const fetchWithTimeout = async (url, code) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTEGRITY_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createIntegrityError(code, `Integrity request timed out after ${INTEGRITY_TIMEOUT_MS / 1000} seconds.`);
    }
    throw createIntegrityError(code, 'Integrity request failed.');
  } finally {
    clearTimeout(timer);
  }
};

export const runCryptoKnownAnswerTests = async () => {
  const crypto = getCrypto();

  const sha256 = await crypto.subtle.digest('SHA-256', textEncoder.encode('abc'));
  assertEqual(
    'SHA-256',
    toHex(new Uint8Array(sha256)),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'KAT_SHA256_FAILED'
  );

  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode('password'), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: textEncoder.encode('salt'), iterations: 1, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  assertEqual(
    'PBKDF2-HMAC-SHA-256',
    toHex(new Uint8Array(derivedBits)),
    '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    'KAT_PBKDF2_FAILED'
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes('00000000000000000000000000000000'),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  const aesCipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: hexToBytes('000000000000000000000000') },
    aesKey,
    new Uint8Array()
  );
  assertEqual(
    'AES-128-GCM',
    toHex(new Uint8Array(aesCipher)),
    '58e2fccefa7e3061367f1d57a4e7455a',
    'KAT_AES_GCM_FAILED'
  );

  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  if (randomBytes.every(byte => byte === 0)) {
    throw createIntegrityError('KAT_RNG_FAILED', 'Random source sanity check failed.');
  }
};

const shouldVerifyAssetManifest = () => import.meta.env.PROD;

export const verifyManifestSignature = async (manifest) => {
  if (!INTEGRITY_PUBLIC_KEY_PEM) {
    throw createIntegrityError('APP_SIGNATURE_KEY_MISSING', 'App integrity public key is missing.');
  }
  if (manifest?.signature?.algorithm !== 'RSA-PSS-SHA256' || !manifest.signature.value) {
    throw createIntegrityError('APP_SIGNATURE_MISSING', 'App integrity manifest signature is missing.');
  }

  const crypto = getCrypto();
  const { signature, ...payload } = manifest;
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToBytes(INTEGRITY_PUBLIC_KEY_PEM),
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    publicKey,
    fromBase64(signature.value),
    textEncoder.encode(stableStringify(payload))
  );
  if (!valid) {
    throw createIntegrityError('APP_SIGNATURE_INVALID', 'App integrity manifest signature is invalid.');
  }
};

export const verifyAppAssetIntegrity = async () => {
  if (!shouldVerifyAssetManifest()) return { skipped: true };
  const manifestUrl = new URL(/* @vite-ignore */ '../xkey-integrity-manifest.json', import.meta.url);
  const response = await fetchWithTimeout(manifestUrl, 'MANIFEST_FETCH_FAILED');
  if (!response.ok) throw createIntegrityError('MANIFEST_MISSING', 'App integrity manifest is missing.');

  const manifest = await response.json();
  if (manifest?.app !== 'xKey' || manifest.source !== INTEGRITY_SOURCE || !Array.isArray(manifest.assets)) {
    throw createIntegrityError('MANIFEST_INVALID', 'App integrity manifest is invalid.');
  }
  await verifyManifestSignature(manifest);

  const crypto = getCrypto();
  for (const asset of manifest.assets) {
    if (!asset?.path || !asset?.sha256) throw createIntegrityError('MANIFEST_ENTRY_INVALID', 'App integrity manifest entry is invalid.');
    const assetUrl = new URL(/* @vite-ignore */ `../${asset.path}`, import.meta.url);
    const assetResponse = await fetchWithTimeout(assetUrl, 'ASSET_FETCH_FAILED');
    if (!assetResponse.ok) throw createIntegrityError('ASSET_MISSING', `App asset missing: ${asset.path}`);
    const digest = await crypto.subtle.digest('SHA-256', await assetResponse.arrayBuffer());
    const actual = toHex(new Uint8Array(digest));
    if (actual !== asset.sha256) throw createIntegrityError('ASSET_HASH_MISMATCH', `App asset integrity check failed: ${asset.path}`);
  }

  return { checked: manifest.assets.length };
};

export const runRuntimeIntegrityChecks = async (onStep = () => {}) => {
  onStep('crypto');
  await runCryptoKnownAnswerTests();
  onStep('app');
  await verifyAppAssetIntegrity();
  onStep('done');
};
