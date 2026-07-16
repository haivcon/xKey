import CryptoJS from 'crypto-js';
import type { Wallet, HDRoot } from '../types';
import {
  decryptVaultEnvelope,
  encryptVaultEnvelope,
  isVaultEnvelope,
  type VaultEnvelopeContext,
} from '../utils/crypto/vaultEnvelope';

type EncryptedWallet = Wallet & {
  _fieldEncrypted?: boolean;
  _sensitiveNotesEncrypted?: boolean;
};

type CryptoWorkerRequest =
  | {
      id: string;
      type: 'ENCRYPT_WALLETS';
      payload: { wallets: Wallet[]; key: string; isDecoy?: boolean };
    }
  | {
      id: string;
      type: 'DECRYPT_WALLETS';
      payload: { cipherText: string; key: string; isDecoy?: boolean };
    }
  | {
      id: string;
      type: 'ENCRYPT_HD_ROOTS';
      payload: { roots: HDRoot[]; key: string; isDecoy?: boolean };
    }
  | {
      id: string;
      type: 'DECRYPT_HD_ROOTS';
      payload: { cipherText: string; key: string; isDecoy?: boolean };
    }
  | {
      id: string;
      type: 'GENERATE_KEY';
      payload?: Record<string, never>;
    };

const FIELD_V2_PREFIX = 'xkf2:';
const FIELD_LEGACY_PREFIX = 'xkf:';

/**
 * Generate a random 32-byte key encoded as 64 hex characters.
 */
const generateRandomKey = (): string => CryptoJS.lib.WordArray.random(32).toString();

/**
 * Derive a domain-separated 32-byte field key from the primary vault key.
 */
const deriveFieldKey = (primaryKey: string, purpose = 'default'): string => (
  CryptoJS.HmacSHA256(primaryKey, `xkey_field_salt_v1:${purpose}`).toString()
);

const encryptField = async (
  value: string | undefined,
  fieldKey: string,
  context: VaultEnvelopeContext,
): Promise<string | undefined> => {
  if (!value) return value;
  if (value.startsWith(FIELD_V2_PREFIX)) return value;
  const envelope = await encryptVaultEnvelope(value, fieldKey, context);
  return `${FIELD_V2_PREFIX}${envelope}`;
};

const decryptLegacyField = (cipher: string, fieldKey: string): string => {
  const bytes = CryptoJS.AES.decrypt(cipher.slice(FIELD_LEGACY_PREFIX.length), fieldKey);
  const result = bytes.toString(CryptoJS.enc.Utf8);
  if (!result) throw new Error('Invalid key or corrupted legacy field data');
  return result;
};

const decryptField = async (
  cipher: string | undefined,
  fieldKey: string,
  context: VaultEnvelopeContext,
): Promise<string | undefined> => {
  if (!cipher) return cipher;
  if (cipher.startsWith(FIELD_V2_PREFIX)) {
    return decryptVaultEnvelope(cipher.slice(FIELD_V2_PREFIX.length), fieldKey, context);
  }
  if (cipher.startsWith(FIELD_LEGACY_PREFIX)) {
    return decryptLegacyField(cipher, fieldKey);
  }
  return cipher;
};

const decryptLegacyData = (cipherText: string, key: string): unknown => {
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) throw new Error('Invalid key or corrupted legacy vault data');
  return JSON.parse(decrypted);
};

const encryptData = async (
  data: unknown,
  key: string,
  context: VaultEnvelopeContext,
): Promise<string> => {
  if (!key) throw new Error('Key required for encryption');
  return encryptVaultEnvelope(JSON.stringify(data), key, context);
};

const decryptData = async (
  cipherText: string,
  key: string,
  context: VaultEnvelopeContext,
): Promise<unknown> => {
  if (!key) throw new Error('Key required for decryption');
  try {
    const parsed = isVaultEnvelope(cipherText)
      ? JSON.parse(await decryptVaultEnvelope(cipherText, key, context))
      : decryptLegacyData(cipherText, key);
    if (!Array.isArray(parsed)) throw new Error('Invalid vault payload schema');
    return parsed;
  } catch {
    throw new Error('Invalid key or corrupted data');
  }
};

const walletContext = (isDecoy = false): VaultEnvelopeContext => (
  isDecoy ? 'wallets:decoy' : 'wallets:main'
);

const encryptWallets = async (
  wallets: Wallet[],
  key: string,
  isDecoy = false,
): Promise<string> => {
  const fieldKey = deriveFieldKey(key);
  const noteFieldKey = deriveFieldKey(key, 'sensitive_notes');

  const protectedWallets = await Promise.all(wallets.map(async wallet => ({
    ...wallet,
    privateKey: await encryptField(wallet.privateKey, fieldKey, 'field:secret'),
    seedPhrase: await encryptField(wallet.seedPhrase, fieldKey, 'field:secret'),
    sensitiveNotes: await encryptField(
      wallet.sensitiveNotes,
      noteFieldKey,
      'field:sensitive-notes',
    ),
    _fieldEncrypted: true,
    _sensitiveNotesEncrypted: !!wallet.sensitiveNotes,
  })));

  return encryptData(protectedWallets, key, walletContext(isDecoy));
};

const decryptWallets = async (
  cipherText: string,
  key: string,
  isDecoy = false,
): Promise<EncryptedWallet[]> => {
  const encryptedWallets = await decryptData(
    cipherText,
    key,
    walletContext(isDecoy),
  ) as EncryptedWallet[];
  const fieldKey = deriveFieldKey(key);
  const noteFieldKey = deriveFieldKey(key, 'sensitive_notes');

  return Promise.all(encryptedWallets.map(async wallet => ({
    ...wallet,
    privateKey: await decryptField(wallet.privateKey, fieldKey, 'field:secret'),
    seedPhrase: await decryptField(wallet.seedPhrase, fieldKey, 'field:secret'),
    sensitiveNotes: await decryptField(
      wallet.sensitiveNotes,
      noteFieldKey,
      'field:sensitive-notes',
    ),
  })));
};

const hdRootContext = (isDecoy = false): VaultEnvelopeContext => (
  isDecoy ? 'hd-roots:decoy' : 'hd-roots:main'
);

const encryptHdRoots = async (
  roots: HDRoot[],
  key: string,
  isDecoy = false,
): Promise<string> => {
  const fieldKey = deriveFieldKey(key);
  const protectedRoots = await Promise.all(roots.map(async root => ({
    ...root,
    encryptedSeed: await encryptField(
      root.encryptedSeed,
      fieldKey,
      'field:secret',
    ) || '',
  })));
  return encryptData(protectedRoots, key, hdRootContext(isDecoy));
};

const decryptHdRoots = async (
  cipherText: string,
  key: string,
  isDecoy = false,
): Promise<HDRoot[]> => {
  const roots = await decryptData(cipherText, key, hdRootContext(isDecoy)) as HDRoot[];
  const fieldKey = deriveFieldKey(key);
  return Promise.all(roots.map(async root => ({
    ...root,
    encryptedSeed: await decryptField(
      root.encryptedSeed,
      fieldKey,
      'field:secret',
    ) || '',
  })));
};

self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  const { type, payload, id } = event.data;

  try {
    let result: unknown;
    switch (type) {
      case 'ENCRYPT_WALLETS':
        result = await encryptWallets(payload.wallets, payload.key, payload.isDecoy);
        break;
      case 'DECRYPT_WALLETS':
        result = await decryptWallets(payload.cipherText, payload.key, payload.isDecoy);
        break;
      case 'ENCRYPT_HD_ROOTS':
        result = await encryptHdRoots(payload.roots, payload.key, payload.isDecoy);
        break;
      case 'DECRYPT_HD_ROOTS':
        result = await decryptHdRoots(payload.cipherText, payload.key, payload.isDecoy);
        break;
      case 'GENERATE_KEY':
        result = generateRandomKey();
        break;
      default:
        throw new Error('Unknown worker action');
    }
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};