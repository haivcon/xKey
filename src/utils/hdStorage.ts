import { saveVaultCipher, loadVaultCipher, runCryptoAction } from './storage';
import type { HDRoot } from '../types';

const HD_ROOTS_KEY = 'xkey_hd_roots';
const DECOY_HD_ROOTS_KEY = 'xkey_decoy_hd_roots';

const hdSaveQueues = new Map<string, Promise<boolean>>();

const waitForPendingHDSave = async (storageKey: string): Promise<void> => {
  const pending = hdSaveQueues.get(storageKey);
  if (pending) await pending.catch(() => {});
};

/**
 * Load all HD Roots decrypted from fragmented/legacy secure vault storage.
 */
export const loadHDRoots = async (key: string | null, isDecoy = false): Promise<HDRoot[]> => {
  const storageKey = isDecoy ? DECOY_HD_ROOTS_KEY : HD_ROOTS_KEY;
  await waitForPendingHDSave(storageKey);
  try {
    const { value } = await loadVaultCipher(storageKey);
    if (!value) return [];
    return await runCryptoAction<HDRoot[]>('DECRYPT_HD_ROOTS', { cipherText: value, key });
  } catch (e) {
    console.error('Failed to load HD Roots', e);
    return [];
  }
};

/**
 * Encrypt and save HD Roots to fragmented/legacy secure vault storage.
 */
export const saveHDRoots = async (roots: HDRoot[], key: string | null, isDecoy = false): Promise<boolean> => {
  const storageKey = isDecoy ? DECOY_HD_ROOTS_KEY : HD_ROOTS_KEY;
  const previous = hdSaveQueues.get(storageKey) || Promise.resolve();

  const saveTask = previous.catch(() => {}).then(async () => {
    const encrypted = await runCryptoAction<string>('ENCRYPT_HD_ROOTS', { roots, key });
    await saveVaultCipher(storageKey, encrypted);
    return true;
  }).catch((e) => {
    console.error('Failed to save HD Roots', e);
    return false;
  });

  const queuedTask = saveTask.finally(() => {
    if (hdSaveQueues.get(storageKey) === queuedTask) {
      hdSaveQueues.delete(storageKey);
    }
  });
  hdSaveQueues.set(storageKey, queuedTask);

  try {
    return await saveTask;
  } catch (e) {
    console.error('Failed to save HD Roots', e);
    return false;
  }
};

/**
 * Add a new HD Root, encrypting its seed phrase and saving to disk.
 */
export const createHDRoot = async (
  name: string,
  seedPhrase: string,
  wordCount: 12 | 24,
  key: string | null,
  isDecoy = false
): Promise<HDRoot> => {
  const roots = await loadHDRoots(key, isDecoy);
  const newRoot: HDRoot = {
    _id: 'hdr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    name,
    encryptedSeed: seedPhrase,
    wordCount,
    createdAt: Date.now(),
    lastDerivedIndex: -1,
    networks: [],
  };
  roots.push(newRoot);
  await saveHDRoots(roots, key, isDecoy);
  return newRoot;
};

/**
 * Delete an HD Root from the storage.
 */
export const deleteHDRoot = async (id: string, key: string | null, isDecoy = false): Promise<boolean> => {
  const roots = await loadHDRoots(key, isDecoy);
  const filtered = roots.filter(r => r._id !== id);
  if (filtered.length === roots.length) return false;
  return await saveHDRoots(filtered, key, isDecoy);
};