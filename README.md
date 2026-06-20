# xKey - Offline Web3 Wallet Vault

![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.10.2

### Release Focus

v5.10.2 is a security UX, backup guidance, localization, and release-quality update. It clarifies hardware-bound backup behavior, makes sensitive Settings flows easier to understand, moves destructive data actions into the correct Data tab, fixes folder action menu handling, and adds regression coverage for these workflows.

### Security and Backup Guidance

- **Clear hardware-bound backup warning**: The hardware-bound vault key panel now includes a bold note explaining that a `.xkey` backup exported from a hardware-bound device is intended for that same device and may not work on another device.
- **Stronger enable confirmation**: The hardware-bound mode confirmation dialog now includes the device-bound backup warning directly in the confirmation text, not only in the expanded details panel.
- **Restore and verify guidance**: Backup export, backup verification, advanced scoped export, and Shamir restore flows now show guidance about hardware-bound backups before users move, verify, or restore `.xkey` data.
- **Portable backup clarification**: Data backup screens now explain that portable `.xkey` backups are password-protected and should be clearly labeled when hardware-bound mode is active.

### Settings UI Improvements

- **Collapsible security status**: The Security Status card now has an explicit expand arrow so users can open details only when needed.
- **Light theme contrast fix**: Warning notes in light theme now use shared note styling so text remains readable.
- **Danger Zone relocation**: The destructive "Wipe all vault data" action was moved from the Security tab to the Data tab because it is a data-management action.
- **Shared note component**: Warning, danger, success, and info notes now use a common `Notice` component to keep color contrast consistent across dark, light, and AMOLED themes.
- **Shared Danger Zone component**: The destructive wipe UI is now isolated in a reusable `DangerZone` component, reducing duplicated high-risk UI code.

### Folder Workflow Fixes

- **Folder action menu repair**: The `...` menu beside active folders now opens with one tap/click, uses a larger hit target, stops pointer/click propagation correctly, and renders through a fixed portal so it is not clipped by the horizontal folder scroller.
- **Regression coverage**: New smoke tests verify the Danger Zone tab placement, collapsible security status, folder menu event handling, and hardware-bound locale coverage.

### Localization

- Hardware-bound backup guidance was translated across all supported languages:
  `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.
- New localized strings cover enable confirmation, same-device backup notes, portable backup notes, restore guidance, and verify guidance.

### Release Metadata

- Web/package version: `5.10.2`
- Android `versionName`: `5.10.2`
- Android `versionCode`: `66`
- Git tag for release build: `v5.10.2`

## Quality Checks

The following checks were run before this release:

```bash
npm run lint
npm run build
npm run test:smoke
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
<summary><b>v5.10.1 and earlier summary</b></summary>

- v5.10.1 introduced hardware-bound vault mode, Android screen-capture controls, secure glyph display, scrambled keyboard options, fragmented encrypted vault storage, and expanded Security settings explanations.
- v5.9.x improved Settings navigation, backup UX, Shamir backup/restore, and locale coverage.
- v5.8.x and earlier added Android/Capacitor support, wallet folders and tags, vanity wallet tools, QR workflows, CSV import/export, manual asset balances, decoy vault, kill switch, and native clipboard/haptics.
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
git tag v5.10.2
git push origin v5.10.2
```

Generated release files:

- `xKey-GitHub-v5.10.2.apk` using package `com.haivcon.xkey.github`
- `xKey-GooglePlay-v5.10.2.aab` using package `com.haivcon.xkey`

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
