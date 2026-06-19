# xKey - Offline Web3 Wallet Vault

![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.10.1

### Release Focus

v5.10.1 is a security-hardening release. It upgrades display privacy, Android screen-capture controls, vault key protection, fragmented encrypted storage, settings visibility for high-risk vault workflows, and completes locale key synchronization for all supported languages.

### Security Upgrades

- **Hardware-bound vault key mode**: Added a Settings toggle that can remove the compatibility fallback key and bind vault unlock to the current Android device credential flow.
- **StrongBox / Android Keystore detection**: Added native hardware security status checks, including whether a wrapped vault key is stored and whether the active key is confirmed inside secure hardware.
- **Safer StrongBox fallback**: If a device advertises StrongBox but fails during key generation, xKey falls back to regular Android Keystore instead of failing the setup.
- **Backup confirmation before hardware-only mode**: Enabling hardware-only mode requires an unlocked vault, a device screen lock, and explicit confirmation that a restorable `.xkey` backup exists.
- **Screen capture and screen recording control**: Added an in-app setting to block screenshots and screen recordings on Android through a native screen-security plugin.
- **Shared sensitive-action password UI**: The password used for revealing hidden characters is grouped with screen capture protection to avoid separate confusing password setup flows.
- **Glyph-cypher secure display**: Private keys and seed phrases can be rendered through randomized glyph/canvas display paths to reduce text extraction from ordinary DOM scraping.
- **Anti-overlay keyboard option**: Added a scrambled in-app keyboard mode for sensitive entry fields to reduce predictable tap coordinate capture.
- **Expanded security explanations**: Auto-lock, clipboard cleanup, secure display, screen capture blocking, scrambled keyboard, and hardware-bound mode now include collapsible detail panels.

### Storage Upgrades

- **In-memory decrypted vault workflow**: Decrypted vault data remains in runtime memory for display and editing workflows; plaintext vault data is not intentionally written back to disk.
- **Fragmented encrypted vault storage**: Encrypted vault blobs are split into multiple fragments with manifest metadata and SHA-256 integrity checks instead of relying on a single legacy storage blob.
- **Fail-closed fragment recovery**: Corrupt or mismatched fragment manifests no longer silently fall back to stale legacy storage when that would hide a storage integrity issue.
- **Serialized vault saves**: Wallet save operations are queued per vault storage key to reduce race conditions during rapid edits.

### UI & Localization

- **Security settings redesign**: Security settings now show current selected values in the collapsed row and reveal full explanations only when expanded.
- **Hardware security labels**: The UI distinguishes device StrongBox availability from the actual protection state of the stored vault key.
- **Android sync complete**: New native plugins and web assets are synced into the Android project.
- **Localization refresh**: New security strings were added across the supported locale files.
- **Locale sync patch**: All locale files now include the new security settings keys. Languages without complete native wording use English fallback text instead of showing raw translation keys.

## Quality Checks

The following checks were run before this release:

```bash
npm run build
npm run test:smoke -- --project=chromium
npm run sync
android\gradlew.bat assembleDebug
```

The Vite production build may still report a large chunk warning. This is not a runtime failure, but future releases should continue splitting scanner, analytics, and advanced tooling into smaller lazy-loaded chunks.

## Core Features

**Security & Privacy**

- Offline encrypted wallet vault with local AES-protected storage
- Android Device Credential unlock, Android Keystore integration, and web fallback authentication
- Optional hardware-bound vault key mode for Android
- Secure display rendering, screen capture blocking, clipboard auto-clear, and auto-lock controls
- Offline Shamir's Secret Sharing (2-of-3) backups
- Encrypted portable `.xkey` backups
- Decoy vault and kill switch features

**Wallet Management**

- Folder and tag organization
- Advanced filtering, sorting, search, and batch actions
- Vanity wallet generation with multi-threading
- Manual asset balance tracking with custom units
- Configurable display scale and wallet density

**Offline Utilities**

- Native Android support through Capacitor 8
- QR scanning, display, sharing, and transfer workflows
- CSV import/export
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
<summary><b>v5.9.x: Settings redesign and backup UX</b></summary>

- Redesigned Settings with accordion-style sections and a dedicated Info tab.
- Improved compact security status display.
- Added/fixed translation strings across supported languages.
- Added offline Shamir's Secret Sharing backup and improved QR restore reliability.
</details>

<details>
<summary><b>v5.8.x and earlier</b></summary>

- Added channel-specific Android builds, display-scale safety, vanity wallet improvements, folder workflows, asset balance editing, Android Device Credential unlock, native clipboard/haptics support, QR utilities, backup flows, decoy vault, kill switch, Capacitor migration, launcher icon, and splash assets.
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
git tag v5.10.1
git push origin v5.10.1
```

Generated release files:

- `xKey-GitHub-v5.10.1.apk` using package `com.haivcon.xkey.github`
- `xKey-GooglePlay-v5.10.1.aab` using package `com.haivcon.xkey`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, backup passwords, or Shamir shares.
- Hardware-bound mode increases device binding but makes working backups more important.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- CSV export may expose sensitive data in plain text if private key or seed phrase columns are selected.
- Clipboard auto-clear and screen capture blocking are best-effort and may be limited by the operating system.
- Secure display reduces text extraction exposure but cannot protect against a fully compromised device, camera recording, OCR, or malicious accessibility services.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
