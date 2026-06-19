# xKey - Offline Web3 Wallet Vault

![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.9.2

### Release Focus

v5.9.2 brings a major redesign to the Settings interface, making it cleaner, more spacious, and easier to navigate with an accordion-style layout. It also includes fixes for translation strings.

### Key Upgrades & Features

- **Settings UI Redesign**: The Settings screen now features an accordion-style expand/collapse layout for sections like Appearance, Display Scale, Wallet Density, and Feedback.
- **Dedicated Info Tab**: Moved App Version, Open Source info, and OKX Wallet Guide into a new dedicated "Info" tab to declutter the main settings.
- **Compact Security Status**: Redesigned the Security Status grid into a sleek, space-saving list view.
- **Translation Fixes**: Fixed the missing `settings.tabInfo` translation string across all 15 supported languages.

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

## Core Features

**🔐 Security & Privacy**
- Offline encrypted wallet vault with local AES-protected storage
- Android Device Credential unlock and web fallback authentication
- Offline Shamir's Secret Sharing (2-of-3) backups (No single point of failure)
- Encrypted portable `.xkey` backups
- Decoy vault and kill switch features
- Duplicate detection and analytics

**🗂️ Wallet Management**
- Folder and tag organization
- Advanced filtering, sorting, search, and batch actions
- Vanity wallet generation with multi-threading
- Manual asset balance tracking with custom units
- Configurable display scale and wallet density

**🛠️ Offline Utilities**
- Native Android support (Capacitor 8)
- QR scanning, display, sharing, and transfer workflows
- CSV import/export
- Multi-language UI (15 supported languages)

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
