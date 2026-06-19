# xKey - Offline Web3 Wallet Vault

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.9.1

### Release Focus

v5.9.1 is a maintenance release that unifies the Android package name and branding across all distributions. The app now uses a single, generic `com.haivcon.xkey` package name and features a clean, unified splash screen (animated "xKey" with a glowing key icon), dropping the GitHub and Google Play specific splash screens. 

### Key Upgrades & Features

- **Unified Package Name**: All Android builds now use `com.haivcon.xkey`. The `.github` flavor and suffix have been removed to allow seamless updates across different installation sources.
- **Unified Branding**: Removed channel-specific splash screens (Google Play/GitHub) in favor of a single, clean animated splash screen with a glowing key icon.
- **Translation Updates**: Fixed and extracted several hardcoded strings (e.g. Tags) for full multi-language support.

## Quality Checks

The following checks were run before this release:

```bash
npm run lint
npm run build
npx cap sync android
npm run test:shamir
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
- Offline Shamir's Secret Sharing 2-of-3 backups
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

<details>
<summary><b>v5.9.0: Offline Shamir's Secret Sharing Backup</b></summary>

- **Offline Shamir's Secret Sharing (SSS) Backup (2-of-3)**: Splits the encrypted vault data into 3 parts (Part A, Part B, Part C) as QR code sheets. Restoring requires scanning at least 2 out of the 3 parts.
- **Robust Multi-QR Chunking**: Handles larger backup files by split-chunking each Part (A, B, C) into multiple QR pages. Adds individual page checksums and total Part checksums.
- **Scanner UI & Reliability Improvements**: Fixed camera scanner restart issue during restore. Added detailed validation feedback.
</details>

<details>
<summary><b>v5.8.2: Android Builds, Vanity-Wallets & Organization</b></summary>

- **Channel-specific Android builds**: GitHub APK uses `xKey Github` (package `com.haivcon.xkey.github`), Google Play build keeps `xKey` (package `com.haivcon.xkey`).
- **Display scale safety**: Confirmation dialog and staging draft before applying display scale.
- **Vanity wallet improvements**: Batch generation, automatic folder assignment, time-limit controls, quantity selection, and auto-lock suppression.
- **Folder and wallet organization**: Direct folder creation, switching/scrolling to saved target folders.
- **Asset balance workflow**: Direct address copy/paste inside balance editor, auto-draft saving, and improved mobile layout.
- **QR and settings**: Settings details expansion (version, source, offline, feedback), toast sizing improvements.
</details>

<details>
<summary><b>Older Releases (v5.7.0 and earlier)</b></summary>

- `v5.7.0`: Android Device Credential unlock, asset balance editor, QR sizing, toast improvements, clipboard controls, and display scale refinements.
- `v5.6.0`: Sound and vibration feedback, display scale controls, Lite Mode stability, QR transfer input fixes, and Android haptics sync.
- `v5.5.0`: Wallet row copy/QR actions, native clipboard reliability, default `75%` display scale, and Android Shake to Lock fixes.
- `v5.4.0` and earlier: Responsive home layout, advanced tools, backup flow, decoy vault, kill switch, auto backup, Capacitor migration, launcher icon, and splash assets.
</details>

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
git tag v5.9.0
git push origin v5.9.0
```

Generated release files:

- `xKey-GitHub-v5.9.0.apk` using package `com.haivcon.xkey.github`
- `xKey-GooglePlay-v5.9.0.aab` using package `com.haivcon.xkey`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, or backup passwords.
- CSV export may expose sensitive data in plain text if private key or seed phrase columns are selected.
- Keep a secure device screen lock enabled.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- Clipboard auto-clear is best-effort and may be limited by the operating system.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
