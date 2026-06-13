# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, notes, tags, folders, backups, QR workflows, and batch operations in a local encrypted app.

The app is built with **React**, **Vite**, **Capacitor 8**, **AES encryption**, biometric/device authentication support, Android packaging, and localization across 15 languages.

> Your keys are stored locally. xKey is designed as a private cold-vault style manager, not as a network-connected trading wallet.

## Current Release: v5.4.0

### Release Focus

v5.4.0 focuses on display scaling, QR usability, Android/WebView layout stability, responsive tool surfaces, and localization cleanup. This release improves the experience for users who want to reduce UI scale to see more wallets on screen without breaking QR modals, wallet cards, sticky toolbars, or icons.

### Display Scale System

- Added a persistent Display Scale setting in General Settings.
- Supports custom scale values from `5%` to `200%`.
- Added quick presets: `50%`, `75%`, `100%`, `125%`, `150%`, and `200%`.
- Added a polished custom slider with progress styling and a safer numeric input flow.
- Fixed manual scale input so users can delete the old value and type a new one without the field immediately snapping back.
- Applies scale globally through a root CSS variable and Capacitor Preferences.
- Updated icons on Home, Settings, tool sheets, and major modals so they scale with the UI instead of staying at fixed pixel sizes.
- Fixed network badges on wallet cards so labels such as `XLAYER` scale correctly.

### QR and Camera Improvements

- Reworked QR modals to size QR codes from the real viewport using `dvw` and `dvh`.
- Fixed QR codes being clipped when the user reduces display scale.
- Added tap-to-zoom for wallet QR codes.
- Added tap-to-zoom for QR Transfer codes.
- Added a full-screen QR zoom viewer that fits within the current device screen.
- Reworked QR Transfer QR sizing to avoid fixed `300px` rendering.
- Improved QR scanner sizing so the scan box adapts to the device viewport.
- Added translated camera-denied messages for all supported languages.

### Sticky Layout and Virtual List Fixes

- Replaced fixed Home sticky offsets with a measured header height.
- Home toolbar and folder sidebar now follow the real header height after scale changes.
- Wallet virtual list now re-measures offsets and estimated row size when display scale changes.
- Fixed cases where wallet cards could be partially covered by the toolbar after scaling.
- Improved Settings sidebar sticky offset to behave better with scaled UI.

### Responsive Tool and Modal Scaling

- Applied scale-aware icon handling to major modals and tool surfaces:
  - Advanced tools
  - Create wallet
  - Donate/support
  - Duplicate detector
  - Export CSV
  - Bulk network change
  - Move folder
  - QR receive
  - QR scanner
  - QR transfer
- Kept QR rendering independent from root scale where needed so scan quality and layout remain stable.

### Localization Cleanup

- Added translations for the new display scale labels.
- Added translations for QR zoom hints and camera permission errors.
- Replaced remaining hardcoded wallet move text with `walletCard.moveBtn`.
- Updated search placeholders that were still in English across multiple locale files.
- Verified that every locale contains all English translation keys.

### Android and Build Updates

- Updated app version to `5.4.0`.
- Updated Android `versionCode` to `54`.
- Synced Capacitor Android assets after the production build.
- Confirmed Android debug build succeeds.
- Confirmed `.gitignore` excludes the local `1/` workspace so notes, keystores, or local release files are not pushed.

### Quality Checks

The following checks were run successfully before release:

```bash
npm run lint
npm run build
npx cap sync android
android/gradlew assembleDebug
```

Translation key coverage was also verified across all 15 locale files.

The Vite production build currently reports a large chunk warning. This is not a runtime error, but future releases may split more screens into dynamic chunks.

## Core Features

- Offline encrypted wallet vault
- AES-protected local wallet storage
- PIN and biometric/device authentication support
- Web and Android support through Capacitor
- Display scale customization
- Wallet folders and filtering
- Wallet tags and tag filtering
- Batch wallet selection and actions
- CSV import/export
- Encrypted portable `.xkey` backups
- Duplicate detection
- Analytics dashboard
- QR scanning and QR transfer utilities
- Multi-language UI

## Supported Languages

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

## Project Links

- GitHub: <https://github.com/haivcon/xkey>
- Website: <https://xlayer.my>
- X: <https://x.com/haivcon>
- Telegram: <https://t.me/haivcon>

## Legacy Highlights

Older releases introduced and refined the foundation of xKey:

- Responsive wallet grid and compact toolbar redesign
- Advanced tools grouped by workflow
- Web authentication fallback and first-run PIN flow
- Import/export improvements for CSV, JSON, TXT, and `.xkey`
- Lazy wallet rendering for larger vaults
- Drag-and-drop custom ordering
- Markdown notes
- Decoy vault, shake-to-lock, kill switch, auto backup, and clipboard controls
- Capacitor 8 migration and Android release workflow
- Launcher icon and splash screen generation

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
git tag v5.4.0
git push origin v5.4.0
```

Generated release files:

- `xKey-Release-v5.4.0.apk`
- `xKey-Release-v5.4.0.aab`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose private keys or seed phrases in plain text if those columns are selected.
- Keep a secure device screen lock enabled.
- Removing the device screen lock can invalidate Android Keystore-backed authentication keys.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
