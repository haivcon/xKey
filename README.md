<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for wallet records, private keys, seed phrases, encrypted backups, Shamir QR recovery, local audit history, and offline vanity wallet generation.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

---

## Current Release: v6.0.9

xKey v6.0.9 is the current synchronized web and Android release. This release updates the app version metadata, Android build metadata, documentation, and release automation notes used for GitHub Releases.

### What's New

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
- **Android release metadata:** `versionName 6.0.9`, `versionCode 107`.
---

## Core Features

### Security and Privacy

- Offline encrypted local vault for wallet records and secret material.
- Android Device Credential and Android Keystore integration where supported.
- Optional privacy masking, explicit reveal/copy actions, hold-to-reveal secret viewing, clipboard safety flows, auto-lock, decoy vault, screen-capture controls, and local audit history.
- Encrypted portable `.xkey` backups with verification flows.
- Shamir Secret Sharing QR recovery for offline recovery workflows.
- No custody server, no cloud sync requirement, and no telemetry requirement.

### Wallet and Data Management

- Wallet folders, tags, search, combined filter/sort panel, batch actions, pinning, manual balances, and configurable wallet density.
- QR display/share workflows and CSV import/export.
- Drag wallets into folders on desktop layouts.
- Mobile swipe affordances for common wallet-card actions.
- Multi-language UI: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

### Offline Vanity Wallet Generation

- Offline vanity address scanning with CPU/heat warnings.
- Generated private keys and seed phrases are hidden until explicitly revealed.
- Supports individual saves, bulk saves, folder routing, and bounded reserve limits.

---

## Project Structure

```text
xKey/
├─ android/                    Capacitor Android project and Gradle release metadata
├─ assets/                     Project assets
├─ icons/                      Icon sources
├─ public/                     Static web assets
├─ scripts/                    Maintenance and audit scripts
├─ src/
│  ├─ app/                     App constants and shared app-level contracts
│  ├─ components/              Feature and reusable React UI components
│  │  ├─ auth/                 Unlock, onboarding, and auth error screens
│  │  ├─ backup/               Backup export/import UI
│  │  ├─ create-wallet/        Create/import/vanity wallet feature module
│  │  ├─ entropy/              Advanced entropy and derivation panels
│  │  ├─ qr/                   QR scanner/display/transfer components
│  │  ├─ settings/             Settings tabs and security/data panels
│  │  ├─ shamir/               Shamir backup/restore UI
│  │  ├─ shared/               Shared UI helpers
│  │  ├─ vanity/               Vanity score UI
│  │  └─ wallet/               Wallet cards, lists, sorting, swipe/drop UX
│  ├─ contexts/                Theme, language, toast, confirm, vault contexts
│  ├─ hooks/                   App, security, backup, vanity, and wallet hooks
│  ├─ locales/                 Localized strings
│  ├─ utils/                   Storage, crypto, audit, amount, wallet utilities
│  └─ types.ts                 Core TypeScript models
├─ tests/                      Focused tests and smoke/regression specs
├─ capacitor.config.ts         Capacitor app configuration
├─ package.json                Web app scripts and version
└─ vite.config.ts              Vite build configuration
```

> Local instruction/scratch folder `1/` is intentionally ignored and must not be pushed.

---

## Build and Verify

```bash
npm install
npm run type-check
npm run build
npx cap sync android
```

Additional focused checks:

```bash
npm run test
npm run locale:audit
npm run test:smoke
```

Android release builds are triggered by git tags matching `v*`.

---

## Store Listing Copy

Short description:

```text
Offline wallet vault. NOT YOUR KEY, NOT YOUR CRYPTO.
```

Long description opener:

```text
xKey is an offline-first Web3 wallet vault for people who want direct local control of wallet keys, encrypted backups, local audit history, Shamir QR recovery, privacy masking, and advanced offline vanity wallet generation. NOT YOUR KEY, NOT YOUR CRYPTO.
```

---

## Older Release Summary

Older details are intentionally summarized here; see `CHANGELOG.md` for the compact history.

- v5.22.0: release metadata update before the mobile layout polish pass.
- v5.21.9: privacy mode, wallet card, dashboard, empty-state, folder drag/drop, and transition polish.
- v5.21.x: DPI, branding, vanity, duplicate detector, and security polish releases.
