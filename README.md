# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, notes, tags, folders, backups, QR workflows, and batch operations in a local encrypted app.

The app is built with **React**, **Vite**, **Capacitor 8**, **AES encryption**, biometric/device authentication support, Android packaging, and localization across 15 languages.

> Your keys are stored locally. xKey is designed as a private cold-vault style manager, not as a network-connected trading wallet.

## Current Release: v5.6.0

### Release Focus

v5.6.0 improves mobile comfort, feedback controls, QR transfer reliability, and Android native integration. The release focuses on making Settings easier to use, keeping Lite Mode visually stable, and ensuring the Android project receives the latest synced Capacitor assets.

### Sound and Vibration Feedback

- Added app-level sound and vibration settings under General Settings.
- Added native Android haptic feedback through `@capacitor/haptics`.
- Kept browser vibration and Web Audio fallbacks for web builds.
- Improved Web Audio startup by resuming the audio context inside user-triggered actions.
- Increased feedback tone duration and volume so sound feedback is easier to notice on Android WebView.
- Persisted feedback preferences through Capacitor Preferences with local storage fallback.

### Display Scale Controls

- Redesigned the custom display scale slider to look more balanced on mobile.
- Reduced the slider thumb and track size for a cleaner Settings layout.
- Rebuilt the manual percentage input so it aligns with the slider and remains easy to edit.
- Added numeric mobile keyboard support for manual scale entry.
- Kept the supported scale range at `5%` to `200%`.

### Lite Mode Stability

- Fixed Lite Mode causing animated logo and donate elements to flicker continuously.
- Lite Mode now disables selected pulse/spin animations instead of forcing ultra-short animation durations.
- Blur effects remain disabled in Lite Mode for better performance on weaker devices.

### QR Transfer Input Fixes

- Fixed password input focus issues in the QR transfer modal.
- Prevented modal pointer events from stealing focus from password fields.
- Added autofocus to the QR transfer password field so users can enter the password faster.

### Localization

- Added translations for the new feedback settings across all supported languages.
- Continued keeping locale coverage aligned so new UI strings do not appear as raw translation keys.

### Android and Build Updates

- Updated app version to `5.6.0`.
- Updated Android `versionCode` to `56`.
- Added and synced the Capacitor Haptics Android plugin.
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
git tag v5.6.0
git push origin v5.6.0
```

Generated release files:

- `xKey-Release-v5.6.0.apk`
- `xKey-Release-v5.6.0.aab`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose private keys or seed phrases in plain text if those columns are selected.
- Keep a secure device screen lock enabled.
- Removing the device screen lock can invalidate Android Keystore-backed authentication keys.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
