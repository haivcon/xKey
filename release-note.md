Summary of implemented changes:

1. Secret placement warning
- Added detection for private keys and mnemonic-like recovery phrases in non-secret fields.
- If a user pastes sensitive material into wallet notes or wallet name, xKey now warns that the content should be moved to a protected secret field.
- Added guidance/actions to move detected content into the appropriate protected field instead of leaving it in regular notes.

2. Data sensitivity classification
- Added a new sensitivity model in `src/utils/dataSensitivity.ts`.
- Introduced sensitivity levels:
  - `public`
  - `private`
  - `critical_secret`
  - `recovery_material`
- Introduced secret/data kinds:
  - `address`
  - `privateKey`
  - `mnemonic`
  - `backupHint`
  - `sensitiveNote`
  - `generic`
- These labels allow xKey to apply different security behavior depending on the data type.

3. Clipboard policy by secret type
- Added per-kind clipboard policies.
- Addresses are treated as public and can remain on the clipboard longer.
- Private keys, mnemonic phrases, and sensitive notes are treated as high-risk secrets with shorter default clipboard lifetime.
- Backup hints and generic private data use separate warning/timeout policies.

4. Multi-layer clipboard clearing
- Enhanced `secureCopy` in `src/utils/clipboard.ts`.
- After copying sensitive content, xKey schedules automatic clipboard clearing.
- Clipboard clearing now overwrites the clipboard in multiple steps:
  - random noise string,
  - empty string,
  - blank space.
- This gives better protection than a single clear operation.

5. Disable secret copy mode
- Added a high-security setting key: `xkey_disable_secret_copy`.
- When enabled, copying private keys, mnemonic phrases, and sensitive notes is blocked.
- Users can still use reveal-style access, but direct copy for secrets is prevented.

6. Sensitive notes
- Added `sensitiveNotes` support to the wallet data model.
- Sensitive notes are handled separately from normal notes.
- They follow secret-style behavior, including reveal/copy protection and secret clipboard policy.
- This allows users to store confidential notes without exposing them like ordinary wallet notes.

7. Wallet UI integration
- Updated `WalletCard` behavior to support sensitive notes and protected copy/reveal flows.
- Added warning and migration UI for sensitive content found in regular notes.
- Added protected handling for copying private keys, mnemonic phrases, addresses, and sensitive notes using the new clipboard policy system.

8. Settings UI integration
- Added security setting support for disabling secret copy.
- Integrated the new clipboard/security behavior into the existing security settings structure.

9. Localization
- Added English locale strings for the new security warnings, labels, and actions in `src/locales/en.ts`.

10. Tests
- Added `tests/secret-detection.test.mjs`.
- The test verifies:
  - private key detection,
  - mnemonic-like phrase detection,
  - normal notes are not falsely detected,
  - placement warning text is generated,
  - clipboard policy sensitivity levels are correct,
  - secret-kind classification works.
- Added `test:secret-detection` to `package.json`.
- Included the new test in the main `npm test` chain.
