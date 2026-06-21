const textEncoder = new TextEncoder();
const INTEGRITY_SOURCE = 'github.com/haivcon/xKey';
const INTEGRITY_TIMEOUT_MS = 10000;
const INTEGRITY_PUBLIC_KEY_PEM = __XKEY_INTEGRITY_PUBLIC_KEY__;

type IntegrityErrorCode =
  | 'CRYPTO_RUNTIME_UNAVAILABLE'
  | 'KAT_SHA256_FAILED'
  | 'KAT_PBKDF2_FAILED'
  | 'KAT_AES_GCM_FAILED'
  | 'KAT_RNG_FAILED'
  | 'APP_SIGNATURE_KEY_MISSING'
  | 'APP_SIGNATURE_MISSING'
  | 'APP_SIGNATURE_INVALID'
  | 'MANIFEST_FETCH_FAILED'
  | 'MANIFEST_MISSING'
  | 'MANIFEST_INVALID'
  | 'MANIFEST_ENTRY_INVALID'
  | 'ASSET_FETCH_FAILED'
  | 'ASSET_MISSING'
  | 'ASSET_HASH_MISMATCH';

type IntegrityManifestAsset = {
  path: string;
  bytes: number;
  sha256: string;
};

type IntegrityManifest = {
  app: 'xKey';
  version: string;
  generatedAt: string;
  algorithm: 'sha256';
  source: typeof INTEGRITY_SOURCE;
  assets: IntegrityManifestAsset[];
  signature?: {
    algorithm: 'RSA-PSS-SHA256';
    key: string;
    value: string;
  };
};

type CodedIntegrityError = Error & { code: IntegrityErrorCode };

type RuntimeIntegrityStep = 'crypto' | 'app' | 'done';

const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const toHex = (bytes: Uint8Array): string => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const fromBase64 = (value: string): Uint8Array => Uint8Array.from(atob(value), char => char.charCodeAt(0));

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};

const pemToBytes = (pem: string): Uint8Array => {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
  return fromBase64(base64);
};

export const createIntegrityError = (code: IntegrityErrorCode, message: string): CodedIntegrityError => {
  const error = new Error(`[${code}] ${message} Official source: ${INTEGRITY_SOURCE}`) as CodedIntegrityError;
  error.code = code;
  return error;
};

const getCrypto = (): Crypto => {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle || typeof crypto.getRandomValues !== 'function') {
    throw createIntegrityError('CRYPTO_RUNTIME_UNAVAILABLE', 'WebCrypto runtime is unavailable.');
  }
  return crypto;
};

const assertEqual = (name: string, actual: string, expected: string, code: IntegrityErrorCode): void => {
  if (actual !== expected) {
    throw createIntegrityError(code, `${name} known-answer test failed.`);
  }
};

const fetchWithTimeout = async (url: string | URL, code: IntegrityErrorCode): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTEGRITY_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createIntegrityError(code, `Integrity request timed out after ${INTEGRITY_TIMEOUT_MS / 1000} seconds.`);
    }
    throw createIntegrityError(code, 'Integrity request failed.');
  } finally {
    clearTimeout(timer);
  }
};

export const runCryptoKnownAnswerTests = async (): Promise<void> => {
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
    asBufferSource(hexToBytes('00000000000000000000000000000000')),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  const aesCipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBufferSource(hexToBytes('000000000000000000000000')) },
    aesKey,
    asBufferSource(new Uint8Array())
  );
  assertEqual(
    'AES-128-GCM',
    toHex(new Uint8Array(aesCipher)),
    '58e2fccefa7e3061367f1d57a4e7455a',
    'KAT_AES_GCM_FAILED'
  );

  const randomBytes = crypto.getRandomValues(new Uint8Array(16) as unknown as Uint8Array<ArrayBuffer>);
  if (randomBytes.every(byte => byte === 0)) {
    throw createIntegrityError('KAT_RNG_FAILED', 'Random source sanity check failed.');
  }
};

const shouldVerifyAssetManifest = (): boolean => import.meta.env.PROD;

export const verifyManifestSignature = async (manifest: IntegrityManifest): Promise<void> => {
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
    asBufferSource(pemToBytes(INTEGRITY_PUBLIC_KEY_PEM)),
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    publicKey,
    asBufferSource(fromBase64(signature.value)),
    textEncoder.encode(stableStringify(payload))
  );
  if (!valid) {
    throw createIntegrityError('APP_SIGNATURE_INVALID', 'App integrity manifest signature is invalid.');
  }
};

export const verifyAppAssetIntegrity = async (): Promise<{ skipped: true } | { checked: number }> => {
  if (!shouldVerifyAssetManifest()) return { skipped: true };
  const manifestUrl = new URL(/* @vite-ignore */ '../xkey-integrity-manifest.json', import.meta.url);
  const response = await fetchWithTimeout(manifestUrl, 'MANIFEST_FETCH_FAILED');
  if (!response.ok) throw createIntegrityError('MANIFEST_MISSING', 'App integrity manifest is missing.');

  const manifest = await response.json() as IntegrityManifest;
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

export const runRuntimeIntegrityChecks = async (onStep: (step: RuntimeIntegrityStep) => void = () => {}): Promise<void> => {
  onStep('crypto');
  await runCryptoKnownAnswerTests();
  onStep('app');
  await verifyAppAssetIntegrity();
  onStep('done');
};
