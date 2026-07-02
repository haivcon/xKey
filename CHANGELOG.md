# Changelog

All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.

## [6.0.20] - 2026-07-02

### Release Notes

- - 🔐 Fixed fresh-install fingerprint unlock asking twice before opening the app.
- - 🛡️ Skipped legacy biometric migration when no existing vault data is present.
- - ⚡ Streamlined first unlock flow while keeping secure device-protected key storage.
- - ✅ Verified the security storage change with a successful TypeScript type-check.
- - ✨ Upgraded vanity sub-filters with letter/number mode choices.
- - 🧩 Fixed preview updates for lucky suffix and unique-character filters.
- - 🔆 Added optional keep-screen-awake during vanity generation.
- - 🌐 Added localized hints and labels for new vanity controls.

### Release Metadata

- `package.json`: `6.0.20`
- `package-lock.json`: `6.0.20`
- Android `versionName`: `6.0.20`
- Android `versionCode`: `118`

## [6.0.19] - 2026-07-01

### Release Notes

- - 🚀 Improved app startup stability by fixing hydration mismatch and deferring rendering until client mount.
- - 📱 Added Android app-only display scaling with native WebView support, safe clamping, and localized controls.
- - 🛡️ Strengthened device integrity, secondary PIN protection, brute-force backoff, and sensitive-action verification.
- - 🔐 Added a high-security session preset with clearer grouped security settings and safer verification UX.
- - 🧠 Added 2D HD Wallet Explorer for 24-word BIP-39 seeds with branch visualization and duplicate protection.
- - 🔎 Enhanced Vanity tools with pattern analysis, ETA, live progress, worker tuning, time limits, and quantity mode.
- - 📦 Added extra vanity wallet auto-keep with scoring, filters, previews, save-all controls, and backup confirmation.
- - 🌡️ Added CPU thermal monitoring with warning, pause, critical thresholds, and heat-safety guidance.
- - 💾 Added encrypted vanity session restore after app restart with pending-session alerts and safe cleanup.
- - 📊 Added local vanity session reports after each run, including time, speed, pattern, candidates, and result.
- - 🧹 Added clear-history support for saved vanity reports.
- - 🌐 Synchronized translations and locale keys across all supported languages.

### Release Metadata

- `package.json`: `6.0.19`
- `package-lock.json`: `6.0.19`
- Android `versionName`: `6.0.19`
- Android `versionCode`: `117`

## [6.0.18] - 2026-07-01

### Release Notes

- ## Release Notes
- This update enhances Key Health with a more professional, compact review experience and stronger wallet safety checks.
- ### Key Highlights
- - Improved duplicate detection across wallet address, private key, mnemonic, and derivation path.
- - Expanded Key Health scoring with checks for key format, entropy, reuse, missing metadata, and backup freshness.
- - Added backup warnings for new or recently edited wallets that still require a fresh backup.
- - Moved Key Health into the Tools area with attention badges for cleaner access and better visibility.
- - Refined the Key Health modal with clearer status cards, grouped risk/action sections, i18n-ready copy, and light/dark-safe styling.
- - Preloaded tool-related modal chunks from the Tools button to reduce perceived lag when opening health and tools screens.
- - Added tests and validation coverage to support safer releases.

### Release Metadata

- `package.json`: `6.0.18`
- `package-lock.json`: `6.0.18`
- Android `versionName`: `6.0.18`
- Android `versionCode`: `116`

## [6.0.17] - 2026-07-01

### Release Notes

- ✨ Improved vanity wallet highlighting for primary and extra matches.
- 🏠 Saved vanity wallets now keep highlight metadata for accurate home screen display.
- 🧩 Reused one highlight-length helper to prevent head/tail overlap in compact addresses.
- ✅ Added regression coverage for main, extra, head, tail, and both-side vanity patterns.
- 🛠 Verified with vanity tests, type-check, and lint.
- 🔎 Added extra vanity filters for numeric tails and low-diversity edge patterns, updated localized labels, fixed duplicated/escaped locale entries, and verified with build plus vanity-related tests.
- 🔐 Added encrypted vault snapshots before import, merge, batch delete, and schema migration. Local rollback can restore the latest snapshot after risky changes, and migrations now support dry-run reporting before apply.
- 🔔 Standardized top toast notifications with shared design tokens, severity variants, responsive typography, and i18n-safe helpers. Added HODL text for the reveal hint across all locales and verified the production build.

### Release Metadata

- `package.json`: `6.0.17`
- `package-lock.json`: `6.0.17`
- Android `versionName`: `6.0.17`
- Android `versionCode`: `115`

## [6.0.16] - 2026-07-01

### Release Notes

- 🔒 Added password challenge before .xkey backup export.
- 🎯 Import only selected wallets, folders, or tags from backups.
- 🧩 Improved backup preview, selection summary, and restore flow.
- 📱 Fixed mobile keyboard handling to keep inputs visible without blank space.
- ✅ Build verified for a stable release.

### Release Metadata

- `package.json`: `6.0.16`
- `package-lock.json`: `6.0.16`
- Android `versionName`: `6.0.16`
- Android `versionCode`: `114`

## [6.0.15] - 2026-06-30

### Release Notes

- 📦 CSV Import/Export upgraded.
- 🛡️ Safer CSV export with standard quoting and formula-injection protection.
- 🔍 Added CSV import preview with column mapping, duplicate checks, invalid/missing address detection, and sensitive-data warnings.
- 🎨 Improved CSV preview UI readability, light-theme colors, and button tap feedback.
- ✅ Added CSV tests and type-check validation.

### Release Metadata

- `package.json`: `6.0.15`
- `package-lock.json`: `6.0.15`
- Android `versionName`: `6.0.15`
- Android `versionCode`: `113`

## [6.0.14] - 2026-06-30

### Release Notes

- Updated android/app/build.gradle (+2/-2): bumped Android versionName/versionCode so the APK/AAB can be published as a new build.
- Updated package-lock.json (+2/-2): kept the locked dependency metadata aligned with package.json.
- Updated package.json (+1/-1): synchronized the app version and npm package metadata for this release.
- Updated src/components/ExportCSVModal.tsx (+25/-4): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/backup/BackupImportPasswordModal.tsx (+36/-17): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/AdvancedSecuritySection.tsx (+92/-71): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/PinBiometricSection.tsx (+188/-58): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityAutomationSection.tsx (+45/-36): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityStatusSection.tsx (+75/-64): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityTabContent.tsx (+345/-465): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/features/security/sensitiveActions.ts (+1/-11): updated feature-specific application logic.
- Updated src/features/security/sensitivePin.ts (+14/-23): updated feature-specific application logic.
- Updated src/hooks/useWalletGeneration.ts (+15/-2): updated shared React hook behavior used by the app.
- Updated src/index.css (+229/-1): updated the main app shell, styling, routing, or startup behavior.
- Updated src/locales/ar.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/de.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/en.ts (+102/-2): refreshed translation/localization content shown in the app UI.
- Updated src/locales/es.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/fr.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/hi.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/id.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ja.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ko.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/pt.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ru.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/th.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/tr.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/vi.ts (+102/-2): refreshed translation/localization content shown in the app UI.
- Updated src/locales/zh.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/main.tsx (+4/-1): updated the main app shell, styling, routing, or startup behavior.
- Updated src/utils/clipboard.ts (+13/-2): updated shared utility logic used across the app.

### Release Metadata

- `package.json`: `6.0.14`
- `package-lock.json`: `6.0.14`
- Android `versionName`: `6.0.14`
- Android `versionCode`: `112`

## [6.0.13] - 2026-06-29

### Release Notes

- 🔐 Security settings hardened.
- • Added confirmations before disabling key protections.
- • Improved 6-digit PIN validation for main, decoy, and sensitive-action PINs.
- • Fixed custom auto-lock timing behavior.
- • Added utility tests.
- ✅ Type-check, lint, tests, and production build passed.

### Release Metadata

- `package.json`: `6.0.13`
- `package-lock.json`: `6.0.13`
- Android `versionName`: `6.0.13`
- Android `versionCode`: `111`

## [6.0.12] - 2026-06-29

### Release Notes

- 1.Backup restore safety upgrade: added backup health scoring, sandbox restore dry-run, offline vault diff, duplicate secret/conflict detection, safer import blocking/override checks, restore report export.
- 2.Added a configurable Logo Lock option in Security settings. The header lock button is now hidden inside the xKey logo, with a red glow when enabled. Improved auto-lock timer handling to prevent early unintended locks. Completed i18n coverage for key Security settings strings across 15 languages.

### Release Metadata

- `package.json`: `6.0.12`
- `package-lock.json`: `6.0.12`
- Android `versionName`: `6.0.12`
- Android `versionCode`: `110`

## [6.0.11] - 2026-06-29

### Release Notes

- Security update: added re-authentication for high-risk actions, extra optional PIN for sensitive reveal/export/import flows, emergency lock button with clipboard clearing, stronger PIN lockout tiers, and a high-security session preset enabling no-copy, short auto-lock, screen protection, and stricter secret handling.

### Release Metadata

- `package.json`: `6.0.11`
- `package-lock.json`: `6.0.11`
- Android `versionName`: `6.0.11`
- Android `versionCode`: `109`

## [6.0.10] - 2026-06-29

### Release Notes

- Added context-aware auto-lock presets, custom trigger timing, copy/screen-off lock controls, audit metadata, and localized security settings.

### Release Metadata

- `package.json`: `6.0.10`
- `package-lock.json`: `6.0.10`
- Android `versionName`: `6.0.10`
- Android `versionCode`: `108`

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
