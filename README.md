# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, notes, tags, folders, backups, QR workflows, and batch operations in a local encrypted app.

The app is built with **React**, **Vite**, **Capacitor 8**, **AES encryption**, biometric/device authentication support, Android packaging, and localization across 15 languages.

> Your keys are stored locally. xKey is designed as a private cold-vault style manager, not as a network-connected trading wallet.

## Current Release: v5.5.0

### Release Focus

v5.5.0 improves daily wallet access, quick address actions, clipboard reliability, default display density, and Android shake-to-lock behavior. The release focuses on reducing accidental taps, making copy actions verifiable, and ensuring Android builds receive the latest synced web assets.

### Wallet Copy and QR Actions

- Removed the confusing long-press/tap-to-copy wallet behavior.
- Added an explicit copy button on each wallet row.
- Added a direct QR button on each wallet row so users can open the address QR without expanding the wallet.
- Separated the quick action buttons from the expand arrow with spacing and a visual divider to reduce accidental taps.
- When copying a wallet address, the wallet row temporarily reveals the full address instead of only the shortened `...` version.
- Copy success toasts now identify the wallet and the exact copied address.
- Private key and seed phrase copy buttons now show success/failure notifications without exposing sensitive values in toast messages.

### Native Clipboard Reliability

- Updated the clipboard helper to use `@capacitor/clipboard` first on native platforms.
- Kept `navigator.clipboard` as a fallback for web builds.
- Copy actions now check the actual copy result before showing a success message.
- Clipboard auto-clear now uses the same native-first helper path.

### Display Density

- Changed the default Display Scale from `100%` to `75%` for new installs and fresh app data.
- Existing users keep their saved display scale preference until they change it in Settings.

### Shake to Lock Fixes

- Fixed Shake to Lock not taking effect immediately after enabling it in Settings.
- Added a settings-change event so the motion listener reloads preferences without requiring an app restart or background/foreground cycle.
- Added motion permission handling when enabling Shake to Lock.
- Added a lock cooldown to prevent repeated lock triggers from a single shake.
- Limited the shake listener to active unlocked vault sessions.

### Localization

- Added translations for the new wallet copy, address QR, motion permission, and Shake to Lock status messages across all supported languages.
- Continued keeping locale coverage aligned so new UI strings do not appear as raw translation keys.

### Android and Build Updates

- Updated app version to `5.5.0`.
- Updated Android `versionCode` to `55`.
- Synced Capacitor Android assets after the production build.
- Confirmed Android debug build succeeds.
- Confirmed `.gitignore` keeps the local `1/` workspace out of GitHub.

### Quality Checks

The following checks were run successfully before release:

```bash
npm run lint
npm run build
npx cap sync android
android/gradlew assembleDebug
```

The Vite production build currently reports a large chunk warning. This is not a runtime error, but future releases may split more screens into dynamic chunks.

## Core Features

- Offline encrypted wallet vault
- AES-protected local wallet storage
- PIN and biometric/device authentication support
- Web and Android support through Capacitor
- Display scale customization
- Wallet folders, filtering, sorting, and search
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

## Previous Releases

- `v5.4.0`: Display scale system, QR viewport fixes, scale-aware icons, sticky layout corrections, and localization cleanup.
- `v5.3.x`: Android startup stability, responsive tools, web authentication fallback, and release build fixes.
- `v5.2.x` and earlier: Wallet grid improvements, advanced tools, `.xkey` backup flow, decoy vault, kill switch, auto backup, clipboard controls, Capacitor 8 migration, launcher icon, and splash assets.

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
git tag v5.5.0
git push origin v5.5.0
```

Generated release files:

- `xKey-Release-v5.5.0.apk`
- `xKey-Release-v5.5.0.aab`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose private keys or seed phrases in plain text if those columns are selected.
- Keep a secure device screen lock enabled.
- Removing the device screen lock can invalidate Android Keystore-backed authentication keys.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
