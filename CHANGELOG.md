# Changelog

All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.

## [6.0.9] - 2026-06-29

### Release Notes

- Summary of implemented changes:
- Recommended note length:
- - Best for GitHub Release body: about 2,000-6,000 characters.
- - Acceptable for detailed technical notes: about 6,000-12,000 characters.
- - Avoid making commit/tag messages too long. Keep the commit summary short, then put detailed notes in the GitHub Release body, CHANGELOG.md, or this note file.
- - For long notes, keep a short visible summary and place implementation details inside expandable sections.
- Quick summary:
- - Added sensitive content detection for non-secret fields.
- - Added data sensitivity classification for wallet data and secret material.
- - Added per-kind clipboard policy and stronger clipboard clearing.
- - Added an option to disable copying high-risk secrets.
- - Added sensitive notes support and Wallet UI integration.
- - Added settings, localization, and automated tests for the new security behavior.
- <details>
- <summary>1. Secret placement warning</summary>
- - Added detection for private keys and mnemonic-like recovery phrases in non-secret fields.
- - If a user pastes sensitive material into wallet notes or wallet name, xKey now warns that the content should be moved to a protected secret field.
- - Added guidance/actions to move detected content into the appropriate protected field instead of leaving it in regular notes.
- </details>
- <details>
- <summary>2. Data sensitivity classification</summary>
- - Added a new sensitivity model in `src/utils/dataSensitivity.ts`.
- - Introduced sensitivity levels:
- - `public`
- - `private`
- - `critical_secret`
- - `recovery_material`
- - Introduced secret/data kinds:
- - `address`
- - `privateKey`
- - `mnemonic`
- - `backupHint`
- - `sensitiveNote`
- - `generic`
- - These labels allow xKey to apply different security behavior depending on the data type.
- </details>
- <details>
- <summary>3. Clipboard policy by secret type</summary>
- - Added per-kind clipboard policies.
- - Addresses are treated as public and can remain on the clipboard longer.
- - Private keys, mnemonic phrases, and sensitive notes are treated as high-risk secrets with shorter default clipboard lifetime.
- - Backup hints and generic private data use separate warning/timeout policies.
- </details>
- <details>
- <summary>4. Multi-layer clipboard clearing</summary>
- - Enhanced `secureCopy` in `src/utils/clipboard.ts`.
- - After copying sensitive content, xKey schedules automatic clipboard clearing.
- - Clipboard clearing now overwrites the clipboard in multiple steps:
- - random noise string,
- - empty string,
- - blank space.
- - This gives better protection than a single clear operation.
- </details>
- <details>
- <summary>5. Disable secret copy mode</summary>
- - Added a high-security setting key: `xkey_disable_secret_copy`.
- - When enabled, copying private keys, mnemonic phrases, and sensitive notes is blocked.
- - Users can still use reveal-style access, but direct copy for secrets is prevented.
- </details>
- <details>
- <summary>6. Sensitive notes</summary>
- - Added `sensitiveNotes` support to the wallet data model.
- - Sensitive notes are handled separately from normal notes.
- - They follow secret-style behavior, including reveal/copy protection and secret clipboard policy.
- - This allows users to store confidential notes without exposing them like ordinary wallet notes.
- </details>
- <details>
- <summary>7. Wallet UI integration</summary>
- - Updated `WalletCard` behavior to support sensitive notes and protected copy/reveal flows.
- - Added warning and migration UI for sensitive content found in regular notes.
- - Added protected handling for copying private keys, mnemonic phrases, addresses, and sensitive notes using the new clipboard policy system.
- </details>
- <details>
- <summary>8. Settings UI integration</summary>
- - Added security setting support for disabling secret copy.
- - Integrated the new clipboard/security behavior into the existing security settings structure.
- </details>
- <details>
- <summary>9. Localization</summary>
- - Added English locale strings for the new security warnings, labels, and actions in `src/locales/en.ts`.
- </details>
- <details>
- <summary>10. Tests</summary>
- - Added `tests/secret-detection.test.mjs`.
- - The test verifies:
- - private key detection,
- - mnemonic-like phrase detection,
- - normal notes are not falsely detected,
- - placement warning text is generated,
- - clipboard policy sensitivity levels are correct,
- - secret-kind classification works.
- - Added `test:secret-detection` to `package.json`.
- - Included the new test in the main `npm test` chain.
- </details>

### Release Metadata

- `package.json`: `6.0.9`
- `package-lock.json`: `6.0.9`
- Android `versionName`: `6.0.9`
- Android `versionCode`: `107`

## [6.0.8] - 2026-06-29

### Release Notes

- Summary of implemented changes:
- 1. Secret placement warning
- - Added detection for private keys and mnemonic-like recovery phrases in non-secret fields.
- - If a user pastes sensitive material into wallet notes or wallet name, xKey now warns that the content should be moved to a protected secret field.
- - Added guidance/actions to move detected content into the appropriate protected field instead of leaving it in regular notes.
- 2. Data sensitivity classification
- - Added a new sensitivity model in `src/utils/dataSensitivity.ts`.
- - Introduced sensitivity levels:
- - `public`
- - `private`
- - `critical_secret`
- - `recovery_material`
- - Introduced secret/data kinds:
- - `address`
- - `privateKey`
- - `mnemonic`
- - `backupHint`
- - `sensitiveNote`
- - `generic`
- - These labels allow xKey to apply different security behavior depending on the data type.
- 3. Clipboard policy by secret type
- - Added per-kind clipboard policies.
- - Addresses are treated as public and can remain on the clipboard longer.
- - Private keys, mnemonic phrases, and sensitive notes are treated as high-risk secrets with shorter default clipboard lifetime.
- - Backup hints and generic private data use separate warning/timeout policies.
- 4. Multi-layer clipboard clearing
- - Enhanced `secureCopy` in `src/utils/clipboard.ts`.
- - After copying sensitive content, xKey schedules automatic clipboard clearing.
- - Clipboard clearing now overwrites the clipboard in multiple steps:
- - random noise string,
- - empty string,
- - blank space.
- - This gives better protection than a single clear operation.
- 5. Disable secret copy mode
- - Added a high-security setting key: `xkey_disable_secret_copy`.
- - When enabled, copying private keys, mnemonic phrases, and sensitive notes is blocked.
- - Users can still use reveal-style access, but direct copy for secrets is prevented.
- 6. Sensitive notes
- - Added `sensitiveNotes` support to the wallet data model.
- - Sensitive notes are handled separately from normal notes.
- - They follow secret-style behavior, including reveal/copy protection and secret clipboard policy.
- - This allows users to store confidential notes without exposing them like ordinary wallet notes.
- 7. Wallet UI integration
- - Updated `WalletCard` behavior to support sensitive notes and protected copy/reveal flows.
- - Added warning and migration UI for sensitive content found in regular notes.
- - Added protected handling for copying private keys, mnemonic phrases, addresses, and sensitive notes using the new clipboard policy system.
- 8. Settings UI integration
- - Added security setting support for disabling secret copy.
- - Integrated the new clipboard/security behavior into the existing security settings structure.
- 9. Localization
- - Added English locale strings for the new security warnings, labels, and actions in `src/locales/en.ts`.
- 10. Tests
- - Added `tests/secret-detection.test.mjs`.
- - The test verifies:
- - private key detection,
- - mnemonic-like phrase detection,
- - normal notes are not falsely detected,
- - placement warning text is generated,
- - clipboard policy sensitivity levels are correct,
- - secret-kind classification works.
- - Added `test:secret-detection` to `package.json`.
- - Included the new test in the main `npm test` chain.

### Release Metadata

- `package.json`: `6.0.8`
- `package-lock.json`: `6.0.8`
- Android `versionName`: `6.0.8`
- Android `versionCode`: `106`

## [6.0.7] - 2026-06-29

### Release Notes

- Summary of implemented changes:

### Release Metadata

- `package.json`: `6.0.7`
- `package-lock.json`: `6.0.7`
- Android `versionName`: `6.0.7`
- Android `versionCode`: `105`

## [6.0.6] - 2026-06-28

### Release Notes

- Updated project files:
- Changed android/app/build.gradle
- Changed package-lock.json
- Changed package.json
- Changed scripts/release.mjs
- Changed src/App.tsx

### Release Metadata

- `package.json`: `6.0.6`
- `package-lock.json`: `6.0.6`
- Android `versionName`: `6.0.6`
- Android `versionCode`: `104`

## [6.0.5] - 2026-06-28

### Release Notes

- Updated project files:
- Changed .github/workflows/build-and-release-apk.yml
- Changed android/app/build.gradle
- Changed package-lock.json
- Changed package.json
- Changed scripts/release.mjs

### Release Metadata

- `package.json`: `6.0.5`
- `package-lock.json`: `6.0.5`
- Android `versionName`: `6.0.5`
- Android `versionCode`: `103`

## [6.0.4] - 2026-06-28

### Release Notes

- update: fix bug font dp; add cpu mode; add ui/ux dashboard

### Release Metadata

- `package.json`: `6.0.4`
- `package-lock.json`: `6.0.4`
- Android `versionName`: `6.0.4`
- Android `versionCode`: `102`

## [6.0.3] - Current Release

### Release Notes

- update

### Release Metadata

- `package.json`: `6.0.3`
- `package-lock.json`: `6.0.3`
- Android `versionName`: `6.0.3`
- Android `versionCode`: `101`


## [6.0.2] - Previous Release

### Release Notes

- Adds hardened GitHub release workflows, clearer Android release download guidance, and a reusable release automation script.
- Synchronizes Android `versionName` with `package.json` to prevent APK metadata from lagging behind the GitHub release tag.

### Release Metadata

- `package.json`: `6.0.2`
- `package-lock.json`: `6.0.2`
- Android `versionName`: `6.0.2`
- Android `versionCode`: `100`


## [6.0.1] - Previous Release

### Release Focus

This update fixes the Android-specific App-only Minimum Width (smallestScreenWidthDp override) to apply correctly on API 30+, fixes early clamping logic that caused inaccurate "Effective scale" calculations, and corrects UI styling issues (double-scaling and mojibake characters) in the settings menu.

### Release Metadata

- `package.json`: `6.0.1`
- `package-lock.json`: `6.0.1`
- Android `versionName`: `6.0.1`
- Android `versionCode`: `99`

## [6.0.0] - Previous Release

### Release Focus

This is an important update as it updates the keystore for the APK in preparation for the Google Play release. It also adds the XKEY_INTEGRITY_KEY_PEM to ensure source code integrity and verify it has not been tampered with. Builds APK with version v6.0.0.

### Release Metadata

- `package.json`: `6.0.0`
- `package-lock.json`: `6.0.0`
- Android `versionName`: `6.0.0`
- Android `versionCode`: `98`

## Previous Releases - Compact Summary

- **5.22.2:** App-only Minimum Width settings for Android and UI language updates.

- **5.22.1:** mobile layout balance, total assets privacy toggle, and header reorganization.
- **5.22.0:** version metadata update before the mobile layout polish release.
- **5.21.9:** privacy mode, wallet card, dashboard, empty-state, folder drag/drop, and transition polish.
- **5.21.8:** Lite Mode relocation, tactile interaction effects, toast layout and slogan formatting polish.
- **5.21.x:** vanity UX, duplicate detector, branding, backup, and security hardening improvements.
- **5.20.x and earlier:** foundational Vite/Capacitor Android setup, vault workflows, QR flows, and wallet management features.
