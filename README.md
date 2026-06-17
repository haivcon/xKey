# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.8.2

### Release Focus

v5.8.2 focuses on channel-specific Android builds, trust, safer settings changes, vanity-wallet workflows, source transparency, and cleaner mobile UX. It improves how users understand the app, how newly created wallets are organized, and how GitHub and Google Play builds are clearly identified.

### Open Source and Offline Transparency

- Added GitHub source link in Settings: <https://github.com/haivcon/xKey>.
- Added clear in-app wording that xKey is open source and runs locally on the user's device.
- Added localized explanation that vault data is not sent to any server and cannot be accessed or modified remotely by a third party.
- Added app version display in Settings and a compact version badge in the Home header.
- App version is now injected from `package.json` and can use native Android app info when available.

### Display Scale Safety

- Added a confirmation dialog before applying display-scale changes.
- Preset buttons, manual percentage entry, and slider changes now require confirmation.
- Slider changes are staged as a draft first, preventing accidental UI resizing while scrolling.
- Canceling the confirmation restores the previous display scale.
- Added full translations for the new display-scale confirmation flow.

### Vanity Wallet Improvements

- Added batch vanity-wallet generation.
- Added automatic saving of generated vanity wallets into a selected folder.
- Added a dedicated `Vanity Wallets` workflow and folder behavior.
- Added time-limit controls and quantity selection for vanity generation.
- Added clearer pattern validation and warnings for long or expensive vanity patterns.
- Kept auto-lock awake while the vanity generator is actively running.
- Improved generated-wallet highlighting with a NEW label and visual focus ring.

### Folder and Wallet Organization

- Added folder creation from the Home screen.
- New wallets now default to the currently selected folder when applicable.
- Improved custom folder persistence and folder-aware wallet creation.
- Improved newly created wallet visibility after save by switching to the target folder and scrolling to the top.
- Adjusted NEW labels so they do not cover wallet action buttons.

### Asset Balance Workflow

- Improved the asset balance editor for users who manually compare wallet addresses with blockchain data.
- Added direct address copy actions and copy-success notifications inside the balance editor.
- Added paste and clear controls for search/address fields.
- Added automatic draft saving while users edit balances, reducing the risk of losing long editing sessions.
- Improved full-address display and balance-card alignment on mobile.
- Added clearer CSV import hints and balance-entry guidance.

### QR and Notification Improvements

- Fixed QR share/download action behavior.
- Improved sensitive QR warnings for better contrast in light theme.
- Improved popup and toast behavior so long copy messages are more compact and scale-aware.
- Added safer confirmation UI styling for important actions.

### Settings and Localization

- Expanded Settings with version, source, offline, feedback, display scale, wallet density, and activity history information.
- Added full translations for new source transparency, display scale confirmation, folder, vanity, balance, QR, and notification strings across supported languages.
- Improved language coverage so new UI does not show raw translation keys.

### Android and Build Updates

- Updated app version to `5.8.2`.
- Updated Android `versionCode` to `60`.
- Added channel-specific Android branding: GitHub APK uses `xKey Github`, while the Google Play build keeps `xKey`.
- Added channel-aware splash branding for GitHub and Google Play builds.
- Split Android release outputs by distribution channel:
  - GitHub APK uses package `com.haivcon.xkey.github` for manual installs and can coexist with the Google Play app.
  - Google Play AAB keeps package `com.haivcon.xkey`.
- Synced latest production web assets into the Android project.
- Kept local scratch folders, APK/AAB outputs, signing files, backups, and the `1/` workspace out of Git.
- Kept local review documents under `docs/` ignored so they are not uploaded to GitHub.

## Quality Checks

The following checks were run before this release:

```bash
npm run lint
npm run build
npx cap sync android
```

The Vite production build may still report a large chunk warning. This is not a runtime failure, but future releases should continue splitting scanner, analytics, and advanced tooling into smaller lazy-loaded chunks.

## Core Features

- Offline encrypted wallet vault
- Local AES-protected wallet storage
- Android Device Credential unlock and web fallback authentication
- Android support through Capacitor 8
- Wallet folders, tags, filters, sorting, search, and batch actions
- Vanity wallet generation
- QR scanning, QR display, QR sharing, and QR transfer utilities
- Manual asset balance tracking with custom units
- CSV import/export
- Encrypted portable `.xkey` backups
- Duplicate detection and analytics
- Display scale and wallet density customization
- Multi-language UI

## Supported Languages

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

## Project Links

- GitHub: <https://github.com/haivcon/xKey>
- Website: <https://xlayer.my>
- X: <https://x.com/haivcon>
- Telegram: <https://t.me/haivcon>

## Previous Releases

- `v5.7.0`: Android Device Credential unlock, asset balance editor, QR sizing, toast improvements, clipboard controls, and display scale refinements.
- `v5.6.0`: Sound and vibration feedback, display scale controls, Lite Mode stability, QR transfer input fixes, and Android haptics sync.
- `v5.5.0`: Wallet row copy/QR actions, native clipboard reliability, default `75%` display scale, and Android Shake to Lock fixes.
- `v5.4.0` and earlier: Responsive home layout, advanced tools, backup flow, decoy vault, kill switch, auto backup, Capacitor migration, launcher icon, and splash assets.

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

GitHub Actions builds and signs release artifacts when a `v*` tag is pushed.

Example:

```bash
git tag v5.8.2
git push origin v5.8.2
```

Generated release files:

- `xKey-GitHub-v5.8.2.apk` using package `com.haivcon.xkey.github`
- `xKey-GooglePlay-v5.8.2.aab` using package `com.haivcon.xkey`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose sensitive data in plain text if private key or seed phrase columns are selected.
- Keep a secure device screen lock enabled.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- Clipboard auto-clear is best-effort and may be limited by the operating system.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
