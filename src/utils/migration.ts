import { Preferences } from '@capacitor/preferences';
import type { Wallet } from '../types';

const SCHEMA_KEY = 'xkey_schema_version';
const CURRENT_SCHEMA = 3;

/**
 * Generate a UUID v4 for wallet identity
 */
type MigratedWallet = Wallet & { _fieldEncrypted?: boolean };

export type MigrationChange = {
  fromVersion: number;
  toVersion: number;
  code: string;
  walletCount: number;
};

export type MigrationDryRun = {
  currentSchema: number;
  targetSchema: number;
  changes: MigrationChange[];
  migrated: boolean;
};

const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const getStoredSchemaVersion = async (): Promise<number> => {
  const { value } = await Preferences.get({ key: SCHEMA_KEY });
  return Number.parseInt(value || '', 10) || 0;
};

const applyMigrations = (
  inputWallets: MigratedWallet[],
  version: number,
): { wallets: MigratedWallet[]; dryRun: MigrationDryRun } => {
  let wallets = inputWallets;
  const changes: MigrationChange[] = [];

  // v0 → v1: Add _id (UUID) to each wallet
  if (version < 1) {
    wallets = wallets.map(w => ({
      ...w,
      _id: w._id || uuid(),
    }));
    changes.push({
      fromVersion: 0,
      toVersion: 1,
      code: 'wallet_id_backfill',
      walletCount: wallets.length,
    });
  }

  // v1 → v2: Add network + pinned defaults
  if (version < 2) {
    wallets = wallets.map(w => ({
      ...w,
      network: w.network || 'ETH',
      pinned: w.pinned || false,
    }));
    changes.push({
      fromVersion: 1,
      toVersion: 2,
      code: 'wallet_defaults_backfill',
      walletCount: wallets.length,
    });
  }

  // v2 → v3: Mark as field-encryption ready
  // Actual field encryption is handled by storage.js on next save
  if (version < 3) {
    wallets = wallets.map(w => ({
      ...w,
      _fieldEncrypted: false,
    }));
    changes.push({
      fromVersion: 2,
      toVersion: 3,
      code: 'field_encryption_marker',
      walletCount: wallets.length,
    });
  }

  return {
    wallets,
    dryRun: {
      currentSchema: version,
      targetSchema: CURRENT_SCHEMA,
      changes,
      migrated: changes.length > 0,
    },
  };
};

export async function dryRunMigrations(wallets: MigratedWallet[]): Promise<MigrationDryRun> {
  const version = await getStoredSchemaVersion();
  return applyMigrations(wallets, version).dryRun;
}

/**
 * Run all pending migrations on wallet data.
 * Returns { wallets, migrated } where migrated=true if any changes were made.
 */
export async function runMigrations(wallets: MigratedWallet[]): Promise<{ wallets: MigratedWallet[]; migrated: boolean; dryRun: MigrationDryRun }> {
  const version = await getStoredSchemaVersion();
  const { wallets: migratedWallets, dryRun } = applyMigrations(wallets, version);

  if (dryRun.migrated) {
    await Preferences.set({ key: SCHEMA_KEY, value: String(CURRENT_SCHEMA) });
  }

  return { wallets: migratedWallets, migrated: dryRun.migrated, dryRun };
}

export { CURRENT_SCHEMA };