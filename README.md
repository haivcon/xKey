# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, notes, tags, folders, backups, QR workflows, asset balances, and batch operations in a local encrypted app.

The app is built with **React**, **Vite**, **Capacitor 8**, **AES encryption**, Android Device Credential support, Android packaging, and localization across 15 languages.

> Your keys are stored locally. xKey is designed as a private cold-vault style manager, not as a network-connected trading wallet.

## Current Release: v5.7.0

### Release Focus

v5.7.0 improves Android-ready security, dense mobile layouts, wallet balance management, QR workflows, notification behavior, and localization coverage. This release focuses on making xKey more comfortable on real phones while keeping sensitive data protected.

### Android Device Credential Unlock

- Added Android Device Credential unlock for native builds.
- Users can unlock with fingerprint, face unlock, device PIN, password, or pattern through the Android system prompt.
- Added an Android Keystore-backed device credential plugin for protected vault key access after system authentication.
- Added clear setup guidance when the device has no screen lock configured.
- Improved recovery behavior when Android security settings change while xKey is installed.

### Asset Balance Management

- Added a full asset balance editor from the total-assets control.
- Added per-wallet balance editing with formatted numeric input.
- Added quick balance actions such as `+100`, `+1000`, `-100`, and reset to zero.
- Added search, filters, CSV import, changed-state tracking, and a sticky save summary.
- Added customizable asset unit labels such as `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, and custom text.

### Home Layout and Wallet Actions

- Added wallet density modes: comfortable, compact, and ultra compact.
- Improved scale-aware icons, network badges, wallet row sizing, and virtualized list measurement.
- Added direct QR and copy actions on wallet cards.
- Copying a wallet address now reveals the full address briefly and shows a compact, scale-aware notification.
- Improved full-address display so addresses fit better on narrow screens.

### Notifications, History, and Privacy

- Toast notifications now respect the user display scale.
- Long copy notifications are limited to a clean two-line layout.
- Added type-aware toast duration for success, warning, error, and copy actions.
- Added safe activity history in General Settings for recent app actions and notifications.
- Added a stronger privacy shield when the app becomes inactive.

### QR, Donate, and Network Notes

- Added QR share and save actions.
- Added warning text for sensitive QR codes such as private keys or seed phrases.
- Improved QR sizing so generated QR codes fit the device viewport more reliably.
- Improved the donate modal layout, project links, copy action, and network note.
- Added the donate network note: `XLAYER, ETH, BSC, and other EVM networks`.

### Settings and Feedback

- Added sound and vibration controls for app feedback.
- Improved the display scale slider and manual percentage input.
- Kept supported display scale from `5%` to `200%`.
- Fixed Lite Mode flicker by disabling selected animations without breaking layout.
- Added configurable auto-lock and clipboard cleanup settings with clearer current values.

### Android and Build Updates

- Updated app version to `5.7.0`.
- Updated Android `versionCode` to `57`.
- Synced the latest production web assets into the Android project.
- Expanded `.gitignore` for local release drafts, temporary files, and signing secrets.
- Confirmed the local `1/` workspace remains ignored and is not included in Git.

### Localization

- Added full translations for new wallet density, activity history, QR, donate, privacy, security, asset balance, sound, vibration, and scale-related UI.
- Checked locale coverage so new features do not render raw translation keys.

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
- Android Device Credential and web fallback authentication
- Web and Android support through Capacitor
- Display scale customization
- Wallet density modes
- Wallet folders, filtering, sorting, and search
- Wallet tags and tag filtering
- Asset balance tracking with custom unit labels
- Batch wallet selection and actions
- CSV import/export
- Encrypted portable `.xkey` backups
- Duplicate detection
- Analytics dashboard
- QR scanning, QR display, QR sharing, and QR transfer utilities
- Multi-language UI

## Supported Languages

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

## Project Links

- GitHub: <https://github.com/haivcon/xkey>
- Website: <https://xlayer.my>
- X: <https://x.com/haivcon>
- Telegram: <https://t.me/haivcon>

## Previous Releases

- `v5.6.0`: Sound and vibration feedback, display scale controls, Lite Mode stability, QR transfer input fixes, and Android haptics sync.
- `v5.5.0`: Wallet row copy/QR actions, native clipboard reliability, default `75%` display scale, and Android Shake to Lock fixes.
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
git tag v5.7.0
git push origin v5.7.0
```

Generated release files:

- `xKey-Release-v5.7.0.apk`
- `xKey-Release-v5.7.0.aab`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose private keys or seed phrases in plain text if those columns are selected.
- Keep a secure device screen lock enabled.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
