Summary of implemented changes:

Recommended note length:
- Best for GitHub Release body: about 2,000-6,000 characters.
- Acceptable for detailed technical notes: about 6,000-12,000 characters.
- Avoid making commit/tag messages too long. Keep the commit summary short, then put detailed notes in the GitHub Release body, CHANGELOG.md, or this note file.
- For long notes, keep a short visible summary and place implementation details inside expandable sections.

Quick summary:
- Added sensitive content detection for non-secret fields.
- Added data sensitivity classification for wallet data and secret material.
- Added per-kind clipboard policy and stronger clipboard clearing.
- Added an option to disable copying high-risk secrets.
- Added sensitive notes support and Wallet UI integration.
- Added settings, localization, and automated tests for the new security behavior.

<details>
<summary>1. Secret placement warning</summary>

- Added detection for private keys and mnemonic-like recovery phrases in non-secret fields.
- If a user pastes sensitive material into wallet notes or wallet name, xKey now warns that the content should be moved to a protected secret field.
- Added guidance/actions to move detected content into the appropriate protected field instead of leaving it in regular notes.

</details>

<details>
<summary>2. Data sensitivity classification</summary>

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

</details>

<details>
<summary>3. Clipboard policy by secret type</summary>

- Added per-kind clipboard policies.
- Addresses are treated as public and can remain on the clipboard longer.
- Private keys, mnemonic phrases, and sensitive notes are treated as high-risk secrets with shorter default clipboard lifetime.
- Backup hints and generic private data use separate warning/timeout policies.

</details>

<details>
<summary>4. Multi-layer clipboard clearing</summary>

- Enhanced `secureCopy` in `src/utils/clipboard.ts`.
- After copying sensitive content, xKey schedules automatic clipboard clearing.
- Clipboard clearing now overwrites the clipboard in multiple steps:
  - random noise string,
  - empty string,
  - blank space.
- This gives better protection than a single clear operation.

</details>

<details>
<summary>5. Disable secret copy mode</summary>

- Added a high-security setting key: `xkey_disable_secret_copy`.
- When enabled, copying private keys, mnemonic phrases, and sensitive notes is blocked.
- Users can still use reveal-style access, but direct copy for secrets is prevented.

</details>

<details>
<summary>6. Sensitive notes</summary>

- Added `sensitiveNotes` support to the wallet data model.
- Sensitive notes are handled separately from normal notes.
- They follow secret-style behavior, including reveal/copy protection and secret clipboard policy.
- This allows users to store confidential notes without exposing them like ordinary wallet notes.

</details>

<details>
<summary>7. Wallet UI integration</summary>

- Updated `WalletCard` behavior to support sensitive notes and protected copy/reveal flows.
- Added warning and migration UI for sensitive content found in regular notes.
- Added protected handling for copying private keys, mnemonic phrases, addresses, and sensitive notes using the new clipboard policy system.

</details>

<details>
<summary>8. Settings UI integration</summary>

- Added security setting support for disabling secret copy.
- Integrated the new clipboard/security behavior into the existing security settings structure.

</details>

<details>
<summary>9. Localization</summary>

- Added English locale strings for the new security warnings, labels, and actions in `src/locales/en.ts`.

</details>

<details>
<summary>10. Tests</summary>

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

</details>