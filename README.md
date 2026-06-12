# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, notes, tags, folders, backups, and batch workflows in a local encrypted app.

The app is built with **React**, **Vite**, **Capacitor 8**, **AES encryption**, biometric/device authentication support, and full localization across 15 languages.

> Your keys are stored locally. xKey is designed as a private cold-vault style manager, not as a network-connected trading wallet.

## Current Release: v5.3.0

### Release Focus

v5.3.0 focuses on usability, responsive layout, advanced wallet tooling, web compatibility, translation coverage, and a cleaner author/support experience.

### Major UI and Layout Upgrades

- Reworked the home screen for wide displays, tablets, and desktop browsers.
- Added responsive wallet grids so large screens no longer waste empty side space.
- Improved sticky header, folder tabs, search, and action toolbar behavior while scrolling.
- Reduced toolbar height and removed excessive gaps between controls and wallet cards.
- Reorganized mobile toolbar layout so the Add Wallet action remains clearly visible.
- Improved mobile tool sheets to avoid covering wallet content unnecessarily.
- Compact advanced tools and donation modals for small screens and low-height browser windows.
- Added a compact total-assets placement that avoids taking a large dedicated header block.

### Advanced Tools Redesign

The previous flat list of many tool buttons has been simplified into workflow-based sections:

- **Check Wallets**
  - Missing data audit
  - Risk scan
  - Duplicate private key / seed / address checks
  - Backup verification

- **Fix Data**
  - Normalize wallet fields
  - Auto-detect obvious networks from address format
  - Merge duplicate wallet records
  - Bulk tag filtered wallets

- **Import / Export**
  - Export filtered or full encrypted `.xkey` backups
  - Compare wallet files without importing them
  - Compare `.csv`, `.json`, and `.xkey` files
  - Pattern-based search handoff to the main search box

- **History & Security**
  - Tool action history
  - Sensitive CSV export lock
  - CSV export confirmation when sensitive data may be exposed

### Import, Export, and Backup Improvements

- Import button now clearly states supported formats: `CSV / .xkey`.
- Export tools distinguish plain CSV export from encrypted `.xkey` backup export.
- Added scoped `.xkey` export for either all wallets or the current filter.
- Added password handling for `.xkey` file comparison and backup verification.
- Added error handling for invalid file types, wrong backup passwords, failed backup exports, and failed wallet saves.

### Search and Scanning Improvements

- Added a paste button directly inside the search input.
- Added camera-based QR address scanning for faster address lookup.
- Extracts EVM and Tron addresses from pasted or scanned text when possible.
- Improved mobile layout for search, filter, sort, camera, and paste controls.

### Localization and i18n

- Completed translation coverage for all newly added tool labels and descriptions.
- Verified required translation keys across all 15 supported languages.
- Added translations for advanced tools, batch actions, dashboard additions, donation website label, and toolbar labels.
- Removed raw translation key leaks such as `advancedTools.title` and `advancedTools.audit`.

Supported locale files:

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

### Web Compatibility Fixes

- Fixed web-mode authentication fallback so first-run web usage can create and unlock a PIN flow properly.
- Improved handling for browser storage and local encrypted data.
- Added safer error states for corrupted or invalid vault data.

### Author and Project Links

The support/about modal now includes:

- GitHub: <https://github.com/haivcon/xkey>
- Website: <https://xlayer.my>
- X: <https://x.com/haivcon>
- Telegram: <https://t.me/haivcon>

### Quality Checks

Before release, the following checks were run successfully:

```bash
npm run lint
npm run build
```

Translation key checks were also run against all 15 locale files.

The Vite production build currently reports a large chunk warning. This is not a runtime error, but future releases may split more screens into dynamic chunks.

## Core Features

- Offline encrypted wallet vault
- AES-protected local wallet storage
- PIN and biometric/device authentication support
- Web and Android support through Capacitor
- Wallet folders and filtering
- Wallet tags and tag filtering
- Batch wallet selection and actions
- CSV import/export
- Encrypted portable `.xkey` backups
- Duplicate detection
- Analytics dashboard
- QR scanning and QR transfer utilities
- Multi-language UI

## Legacy Highlights

Older releases introduced the main architecture and platform foundation:

- React Router based navigation
- Settings split into General, Security, and Data tabs
- Lazy wallet rendering for larger vaults
- Batch wallet operations
- Drag-and-drop custom ordering
- Markdown notes
- JSON and text import support
- Capacitor 8 migration
- Android release workflow with signed APK/AAB output
- Splash screen and launcher icon generation
- Decoy vault, shake-to-lock, kill switch, auto backup, and clipboard controls

## Installation

### Prerequisites

- Node.js 22+
- Java 21+
- Android Studio for Android builds

### Install Dependencies

```bash
npm install
```

### Run Web Development Server

```bash
npm run dev
```

### Build Web App

```bash
npm run build
```

### Sync Android Project

```bash
npm run sync
```

### Build and Open Android Studio

```bash
npm run android
```

## Release Workflow

The GitHub Actions workflow builds and signs release artifacts when a `v*` tag is pushed.

Example:

```bash
git tag v5.3.0
git push origin v5.3.0
```

Generated release files:

- `xKey-Release-v5.3.0.apk`
- `xKey-Release-v5.3.0.aab`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose private keys or seed phrases in plain text if those columns are selected.
- Keep a secure device screen lock enabled.
- Removing the device screen lock can invalidate Android Keystore-backed authentication keys.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
