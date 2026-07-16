export const VAULT_ENVELOPE_FORMAT = 'xkey-vault';
export const VAULT_ENVELOPE_VERSION = 2;

export type VaultEnvelopeContext =
  | 'wallets:main'
  | 'wallets:decoy'
  | 'hd-roots:main'
  | 'hd-roots:decoy'
  | 'field:secret'
  | 'field:sensitive-notes'
  | `setting:${string}`;

type VaultEnvelopeV2 = {
  format: typeof VAULT_ENVELOPE_FORMAT;
  version: typeof VAULT_ENVELOPE_VERSION;
  cipher: 'AES-256-GCM';
  context: VaultEnvelopeContext;
  iv: string;
  payload: string;
};

const IV_BYTES = 12;
const KEY_BYTES = 32;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getWebCrypto = (): Crypto => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('WebCrypto is unavailable.');
  }
  return webCrypto;
};

const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('Invalid vault envelope encoding.');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const hexToBytes = (value: string): Uint8Array => {
  if (!new RegExp(`^[a-fA-F0-9]{${KEY_BYTES * 2}}$`).test(value)) {
    throw new Error('Invalid vault encryption key.');
  }
  const bytes = new Uint8Array(KEY_BYTES);
  for (let index = 0; index < KEY_BYTES; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const contextAad = (context: VaultEnvelopeContext): Uint8Array => (
  textEncoder.encode(`${VAULT_ENVELOPE_FORMAT}|${VAULT_ENVELOPE_VERSION}|${context}`)
);

const importAesKey = async (keyHex: string, usages: KeyUsage[]): Promise<CryptoKey> => (
  getWebCrypto().subtle.importKey(
    'raw',
    asBufferSource(hexToBytes(keyHex)),
    { name: 'AES-GCM' },
    false,
    usages,
  )
);

const parseEnvelope = (value: string): VaultEnvelopeV2 => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid vault envelope.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid vault envelope.');
  }

  const record = parsed as Partial<VaultEnvelopeV2>;
  if (record.format !== VAULT_ENVELOPE_FORMAT) {
    throw new Error('Unsupported vault envelope format.');
  }
  if (record.version !== VAULT_ENVELOPE_VERSION) {
    throw new Error('Unsupported vault envelope version.');
  }
  if (
    record.cipher !== 'AES-256-GCM'
    || typeof record.context !== 'string'
    || typeof record.iv !== 'string'
    || typeof record.payload !== 'string'
  ) {
    throw new Error('Invalid vault envelope metadata.');
  }

  const iv = base64ToBytes(record.iv);
  const payload = base64ToBytes(record.payload);
  if (iv.length !== IV_BYTES || payload.length < 16) {
    throw new Error('Invalid vault envelope payload.');
  }

  return record as VaultEnvelopeV2;
};

export const isVaultEnvelope = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value) as Partial<VaultEnvelopeV2>;
    return parsed?.format === VAULT_ENVELOPE_FORMAT;
  } catch {
    return false;
  }
};

export const encryptVaultEnvelope = async (
  plaintext: string,
  keyHex: string,
  context: VaultEnvelopeContext,
): Promise<string> => {
  const webCrypto = getWebCrypto();
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await importAesKey(keyHex, ['encrypt']);
  const encrypted = await webCrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
      additionalData: asBufferSource(contextAad(context)),
      tagLength: 128,
    },
    key,
    asBufferSource(textEncoder.encode(plaintext)),
  );

  const envelope: VaultEnvelopeV2 = {
    format: VAULT_ENVELOPE_FORMAT,
    version: VAULT_ENVELOPE_VERSION,
    cipher: 'AES-256-GCM',
    context,
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encrypted)),
  };
  return JSON.stringify(envelope);
};

export const decryptVaultEnvelope = async (
  envelopeText: string,
  keyHex: string,
  expectedContext: VaultEnvelopeContext,
): Promise<string> => {
  const envelope = parseEnvelope(envelopeText);
  if (envelope.context !== expectedContext) {
    throw new Error('Vault envelope context mismatch.');
  }

  try {
    const key = await importAesKey(keyHex, ['decrypt']);
    const decrypted = await getWebCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: asBufferSource(base64ToBytes(envelope.iv)),
        additionalData: asBufferSource(contextAad(expectedContext)),
        tagLength: 128,
      },
      key,
      asBufferSource(base64ToBytes(envelope.payload)),
    );
    return textDecoder.decode(decrypted);
  } catch {
    throw new Error('Invalid key or corrupted vault data.');
  }
};