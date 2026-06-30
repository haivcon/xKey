<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for wallet records, private keys, seed phrases, encrypted backups, Shamir QR recovery, local audit history, and offline vanity wallet generation.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

---

## Current Release: v6.0.14

xKey v6.0.14 is the current synchronized web and Android release. This release updates the app version metadata, Android build metadata, documentation, and release automation notes used for GitHub Releases.

### What's New

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
- **Android release metadata:** `versionName 6.0.14`, `versionCode 112`.
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
