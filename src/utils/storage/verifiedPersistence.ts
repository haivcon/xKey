export type VerifiedPersistenceAdapter = {
  write: (value: string) => Promise<void>;
  read: () => Promise<string | null | undefined>;
};

/**
 * Persist a value and verify the exact bytes can be read back.
 * The promise resolves only after a durable, matching read-back.
 */
export async function persistAndVerify(
  value: string,
  adapter: VerifiedPersistenceAdapter,
): Promise<void> {
  await adapter.write(value);
  const persisted = await adapter.read();
  if (persisted !== value) {
    throw new Error('Vault persistence verification failed.');
  }
}