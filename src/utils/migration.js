import { Preferences } from '@capacitor/preferences';

const SCHEMA_KEY = 'xkey_schema_version';
const CURRENT_SCHEMA = 3;

/**
 * Generate a UUID v4 for wallet identity
 */
const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/**
 * Run all pending migrations on wallet data.
 * Returns { wallets, migrated } where migrated=true if any changes were made.
 */
export async function runMigrations(wallets) {
  const { value } = await Preferences.get({ key: SCHEMA_KEY });
  let version = parseInt(value) || 0;
  let migrated = false;

  // v0 → v1: Add _id (UUID) to each wallet
  if (version < 1) {
    wallets = wallets.map(w => ({
      ...w,
      _id: w._id || uuid(),
    }));
    migrated = true;
  }

  // v1 → v2: Add network + pinned defaults
  if (version < 2) {
    wallets = wallets.map(w => ({
      ...w,
      network: w.network || 'ETH',
      pinned: w.pinned || false,
    }));
    migrated = true;
  }

  // v2 → v3: Mark as field-encryption ready
  // Actual field encryption is handled by storage.js on next save
  if (version < 3) {
    wallets = wallets.map(w => ({
      ...w,
      _fieldEncrypted: false,
    }));
    migrated = true;
  }

  if (migrated) {
    await Preferences.set({ key: SCHEMA_KEY, value: String(CURRENT_SCHEMA) });
  }

  return { wallets, migrated };
}

export { CURRENT_SCHEMA };
