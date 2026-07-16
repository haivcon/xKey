import { saveVaultCipher, loadVaultCipher, runCryptoAction } from './storage';
import { isVaultEnvelope } from './crypto/vaultEnvelope';
import type { HDRoot } from '../types';

const HD_ROOTS_KEY = 'xkey_hd_roots';
const DECOY_HD_ROOTS_KEY = 'xkey_decoy_hd_roots';

const hdSaveQueues = new Map<string, Promise<void>>();

const waitForPendingHDSave = async (storageKey: string): Promise<void> => {
  const pending = hdSaveQueues.get(storageKey);
  if (pending) await pending.catch(() => {});
};

/**
 * Load all HD Roots decrypted from fragmented/legacy secure vault storage.
 * Legacy ciphertext is rewritten as AES-GCM only after successful decryption.
 */
export const loadHDRoots = async (
  key: string | null,
  isDecoy = false,
): Promise<HDRoot[]> => {
  const storageKey = isDecoy ? DECOY_HD_ROOTS_KEY : HD_ROOTS_KEY;
  await waitForPendingHDSave(storageKey);
  const { value } = await loadVaultCipher(storageKey);
  if (!value) return [];

  const roots = await runCryptoAction<HDRoot[]>('DECRYPT_HD_ROOTS', {
    cipherText: value,
    key,
    isDecoy,
  });
  if (!isVaultEnvelope(value)) {
    await saveHDRoots(roots, key, isDecoy);
  }
  return roots;
};

/**
 * Encrypt and persist HD Roots. Failures propagate to the mutation caller.
 */
export const saveHDRoots = async (
  roots: HDRoot[],
  key: string | null,
  isDecoy = false,
): Promise<void> => {
  const storageKey = isDecoy ? DECOY_HD_ROOTS_KEY : HD_ROOTS_KEY;
  const previous = hdSaveQueues.get(storageKey) || Promise.resolve();

  const saveTask = previous.catch(() => {}).then(async () => {
    const encrypted = await runCryptoAction<string>('ENCRYPT_HD_ROOTS', {
      roots,
      key,
      isDecoy,
    });
    await saveVaultCipher(storageKey, encrypted);
    const persisted = await loadVaultCipher(storageKey);
    if (persisted.value !== encrypted) {
      throw new Error('HD root persistence verification failed.');
    }
  });

  const queuedTask = saveTask.finally(() => {
    if (hdSaveQueues.get(storageKey) === queuedTask) {
      hdSaveQueues.delete(storageKey);
    }
  });
  hdSaveQueues.set(storageKey, queuedTask);

  await saveTask;
};

/**
 * Add a new HD Root, encrypting its seed phrase and saving to disk.
 */
export const createHDRoot = async (
  name: string,
  seedPhrase: string,
  wordCount: 12 | 24,
  key: string | null,
  isDecoy = false,
): Promise<HDRoot> => {
  const roots = await loadHDRoots(key, isDecoy);
  const newRoot: HDRoot = {
    _id: `hdr_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`,
    name,
    encryptedSeed: seedPhrase,
    wordCount,
    createdAt: Date.now(),
    lastDerivedIndex: -1,
    networks: [],
  };
  await saveHDRoots([...roots, newRoot], key, isDecoy);
  return newRoot;
};

/**
 * Delete an HD Root from storage after a verified persistence commit.
 */
export const deleteHDRoot = async (
  id: string,
  key: string | null,
  isDecoy = false,
): Promise<boolean> => {
  const roots = await loadHDRoots(key, isDecoy);
  const filtered = roots.filter(root => root._id !== id);
  if (filtered.length === roots.length) return false;
  await saveHDRoots(filtered, key, isDecoy);
  return true;
};