<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for wallet records, private keys, seed phrases, encrypted backups, Shamir QR recovery, local audit history, and offline vanity wallet generation.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

---

## Current Release: v6.0.17

xKey v6.0.17 is the current synchronized web and Android release. This release updates the app version metadata, Android build metadata, documentation, and release automation notes used for GitHub Releases.

### What's New

- ✨ Improved vanity wallet highlighting for primary and extra matches.
- 🏠 Saved vanity wallets now keep highlight metadata for accurate home screen display.
- 🧩 Reused one highlight-length helper to prevent head/tail overlap in compact addresses.
- ✅ Added regression coverage for main, extra, head, tail, and both-side vanity patterns.
- 🛠 Verified with vanity tests, type-check, and lint.
- 🔎 Added extra vanity filters for numeric tails and low-diversity edge patterns, updated localized labels, fixed duplicated/escaped locale entries, and verified with build plus vanity-related tests.
- 🔐 Added encrypted vault snapshots before import, merge, batch delete, and schema migration. Local rollback can restore the latest snapshot after risky changes, and migrations now support dry-run reporting before apply.
- 🔔 Standardized top toast notifications with shared design tokens, severity variants, responsive typography, and i18n-safe helpers. Added HODL text for the reveal hint across all locales and verified the production build.
- **Android release metadata:** `versionName 6.0.17`, `versionCode 115`.
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
