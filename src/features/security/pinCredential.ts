import CryptoJS from 'crypto-js';

export const PIN_HASH_KEY = 'xkey_pin_hash';
export const DECOY_PIN_HASH_KEY = 'xkey_decoy_pin_hash';

export type PinCredentialDomain = 'main' | 'decoy' | 'sensitive';

type PinCredentialRecord = {
  version: 2;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  hash: string;
  domain: PinCredentialDomain;
};

export type PinVerificationResult = {
  valid: boolean;
  upgradedRecord?: string;
};

const PIN_RECORD_VERSION = 2;
const PIN_KDF_ITERATIONS = 310_000;
const PIN_HASH_BYTES = 32;
const PIN_SALT_BYTES = 16;
const textEncoder = new TextEncoder();

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const getWebCrypto = (): Crypto => {
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new Error('Secure PIN derivation is unavailable.');
  }
  return globalThis.crypto;
};

const derivePinHash = async (
  pin: string,
  domain: PinCredentialDomain,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> => {
  const crypto = getWebCrypto();
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(`xkey-pin-v2:${domain}:${pin}`),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: salt as unknown as BufferSource,
    },
    material,
    PIN_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
};

const constantTimeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
};

const parseRecord = (stored: string): PinCredentialRecord | null => {
  try {
    const parsed = JSON.parse(stored) as Partial<PinCredentialRecord>;
    if (
      parsed.version !== PIN_RECORD_VERSION
      || parsed.kdf !== 'PBKDF2-SHA256'
      || !Number.isInteger(parsed.iterations)
      || (parsed.iterations || 0) < PIN_KDF_ITERATIONS
      || (parsed.iterations || 0) > 2_000_000
      || typeof parsed.salt !== 'string'
      || typeof parsed.hash !== 'string'
      || !['main', 'decoy', 'sensitive'].includes(String(parsed.domain))
    ) {
      return null;
    }
    return parsed as PinCredentialRecord;
  } catch {
    return null;
  }
};

const legacyHash = (pin: string, domain: PinCredentialDomain): string => (
  domain === 'sensitive'
    ? CryptoJS.SHA256(`${pin}:xkey_sensitive_pin_salt_v1`).toString()
    : CryptoJS.SHA256(pin + 'xkey_pin_salt_v1').toString()
);

export const createPinCredential = async (
  pin: string,
  domain: PinCredentialDomain,
): Promise<string> => {
  const crypto = getWebCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const hash = await derivePinHash(pin, domain, salt, PIN_KDF_ITERATIONS);
  const record: PinCredentialRecord = {
    version: PIN_RECORD_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations: PIN_KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    domain,
  };
  return JSON.stringify(record);
};

export const verifyPinCredential = async (
  pin: string,
  stored: string | null | undefined,
  domain: PinCredentialDomain,
): Promise<PinVerificationResult> => {
  if (!stored) return { valid: false };

  const record = parseRecord(stored);
  if (record) {
    if (record.domain !== domain) return { valid: false };
    try {
      const actual = await derivePinHash(pin, domain, base64ToBytes(record.salt), record.iterations);
      return { valid: constantTimeEqual(actual, base64ToBytes(record.hash)) };
    } catch {
      return { valid: false };
    }
  }

  const expectedLegacy = legacyHash(pin, domain);
  const valid = /^[a-f0-9]{64}$/i.test(stored)
    && constantTimeEqual(textEncoder.encode(expectedLegacy), textEncoder.encode(stored));
  if (!valid) return { valid: false };

  return {
    valid: true,
    upgradedRecord: await createPinCredential(pin, domain),
  };
};

export const isVersionedPinCredential = (stored: string | null | undefined): boolean => (
  !!stored && parseRecord(stored) !== null
);