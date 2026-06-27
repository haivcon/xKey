<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for wallet records, private keys, seed phrases, encrypted backups, Shamir QR recovery, local audit history, and offline vanity wallet generation.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

---

## Current Release: v5.21.9

xKey v5.21.9 focuses on a premium wallet-vault user experience while preserving the project's local-only security model.

### What's New

- **Global Privacy Mode polish:** privacy controls are localized and sensitive wallet values remain masked across key dashboard and card views.
- **Wallet card upgrades:** improved balance typography, hold-to-reveal for private keys and seed phrases, a compact overflow action menu, and mobile swipe actions for pin/unpin and delete.
- **Dashboard polish:** animated statistic cards, chart entrance animations, progress bar transitions, and privacy-aware total value rendering.
- **Empty state onboarding:** redesigned empty vault and empty folder states with clearer CTAs for adding or importing wallets.
- **Folder workflow improvements:** desktop drag/drop from wallet lists into folders with visual folder drop highlighting.
- **Modal and page transitions:** lightweight motion utilities for modal backdrops/panels, with Lite Mode and reduced-motion support.
- **Localization update:** Privacy Mode labels are available in all supported locales.
- **Android release metadata:** `versionName 5.21.9`, `versionCode 94`.

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

- Wallet folders, tags, search, filters, sorting, batch actions, pinning, manual balances, and configurable wallet density.
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
├─ android/                    Capacitor Android project and release metadata
├─ assets/                     Project assets
├─ icons/                      Icon sources
├─ public/                     Static web assets
├─ scripts/                    Maintenance and audit scripts
├─ src/
│  ├─ app/                     App constants and shared app-level contracts
│  ├─ components/              Feature and reusable React UI components
│  │  ├─ backup/               Backup export/import UI
│  │  ├─ create-wallet/        Create/import/vanity wallet feature module
│  │  ├─ qr/                   QR scanner/display/transfer components
│  │  ├─ settings/             Settings tabs and security/data panels
│  │  ├─ shared/               Shared UI helpers
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

- v5.21.8: Lite Mode relocation, tactile interaction polish, toast layout improvements.
- v5.21.7: localized theme names and locale automation improvements.
- v5.21.x: DPI, branding, vanity, duplicate detector, and security polish releases.
