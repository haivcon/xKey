const ENVELOPE_FORMAT = 'xkey-encrypted';
const ENVELOPE_VERSION = 1;
const KDF_ITERATIONS = 310000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type CryptoEnvelope = {
  format: typeof ENVELOPE_FORMAT;
  version: typeof ENVELOPE_VERSION;
  createdAt: string;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: typeof KDF_ITERATIONS;
    salt: string;
  };
  cipher: {
    name: 'AES-256-GCM';
    iv: string;
  };
  payload: string;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const getWebCrypto = (): Crypto => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('WebCrypto is not available.');
  }
  return webCrypto;
};

const deriveAesKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const webCrypto = getWebCrypto();
  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asBufferSource(salt),
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const isCryptoEnvelope = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return parsed?.format === ENVELOPE_FORMAT;
  } catch {
    return false;
  }
};

export const encryptEnvelope = async (data: unknown, password: string): Promise<string> => {
  const webCrypto = getWebCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const cipherBytes = await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    key,
    textEncoder.encode(JSON.stringify(data))
  );

  return JSON.stringify({
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    createdAt: new Date().toISOString(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-256-GCM',
      iv: bytesToBase64(iv),
    },
    payload: bytesToBase64(new Uint8Array(cipherBytes)),
  });
};

export const decryptEnvelope = async <T = unknown>(envelopeText: string, password: string): Promise<T> => {
  const envelope = JSON.parse(envelopeText) as CryptoEnvelope;
  if (envelope?.format !== ENVELOPE_FORMAT) throw new Error('Unsupported encrypted envelope.');
  if (envelope?.version !== ENVELOPE_VERSION) throw new Error('Unsupported encrypted envelope version.');

  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const payload = base64ToBytes(envelope.payload);
  const key = await deriveAesKey(password, salt);
  const plainBytes = await getWebCrypto().subtle.decrypt({ name: 'AES-GCM', iv: asBufferSource(iv) }, key, asBufferSource(payload));
  return JSON.parse(textDecoder.decode(plainBytes)) as T;
};
