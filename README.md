# xKey - Offline Web3 Wallet Vault

![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.10.3

### Release Focus

v5.10.3 hardens xKey's startup path with signed runtime integrity checks, offline cryptographic known-answer tests, and a safer GitHub Actions release pipeline for APK/AAB builds. This release keeps the existing app structure intact while adding stronger tamper detection, clearer failure diagnostics, and complete localization for the new startup integrity messages.

### Runtime Integrity and Anti-Tamper Checks

- **Offline Crypto KATs**: xKey now runs startup known-answer tests for SHA-256, PBKDF2-HMAC-SHA256, AES-GCM, and random-source sanity before opening the vault.
- **Signed asset manifest**: production builds generate `xkey-integrity-manifest.json` and sign it with `RSA-PSS-SHA256`.
- **Manifest source binding**: the manifest declares the official source as `github.com/haivcon/xKey`, and runtime errors include that source for safer user guidance.
- **Focused asset verification**: startup hashing is limited to critical web assets such as `index.html`, the main bundle, App chunk, storage/wallet chunks, CSS, and `crypto.worker`.
- **Clear failure codes**: integrity failures now surface stable codes such as `KAT_SHA256_FAILED`, `APP_SIGNATURE_INVALID`, `MANIFEST_MISSING`, and `ASSET_HASH_MISMATCH`.
- **Startup timeout protection**: manifest and asset fetches use a 10-second timeout so the splash screen does not hang indefinitely.

### Release Pipeline Updates

- **GitHub Actions secrets support**: the Android release workflow now passes `XKEY_INTEGRITY_PUBLIC_KEY_PEM` and `XKEY_INTEGRITY_PRIVATE_KEY_PEM` into the Vite build step.
- **Signed APK and AAB outputs**: the workflow continues producing a GitHub APK and Google Play AAB, both using the existing Android release keystore secrets.
- **Safe local key handling**: `.env.local` remains ignored by Git, while `.env.example` documents the required runtime-integrity key variables.
- **AAB compatibility**: the new integrity manifest is packaged into the app assets before the Android build and is compatible with Google Play Console upload flows.

### Localization

The new startup integrity messages were added across all supported languages:

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

### Release Metadata

- Web/package version: `5.10.3`
- Android `versionName`: `5.10.3`
- Android `versionCode`: `67`
- Git tag for release build: `v5.10.3`

## Quality Checks

The following checks were run before this release:

```bash
npm run lint
npm run build
npm run test:smoke
npx cap sync android
android/gradlew -p android assembleDebug
```

Additional verification performed for this release:

- Signed integrity manifest verified with the configured public key.
- Production preview served `/` and `/xkey-integrity-manifest.json` successfully.
- Production page loaded without triggering the runtime integrity failure screen.
- Android synced assets include a signed manifest with 7 critical asset entries.

The Vite production build may still report a large chunk warning. This is not a runtime failure, but future releases should continue splitting scanner and advanced tooling into smaller lazy-loaded chunks.

## Core Features

**Security & Privacy**

- Offline encrypted wallet vault with local AES-protected storage
- Android Device Credential unlock, Android Keystore integration, and web fallback authentication
- Optional hardware-bound vault key mode for Android
- Signed runtime integrity manifest and offline crypto KAT startup checks
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
<summary><b>v5.10.2 and earlier summary</b></summary>

- v5.10.2 improved security settings UX, hardware-bound backup guidance, light-theme warning contrast, Data-tab Danger Zone placement, folder action menus, and locale coverage.
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

Production builds require runtime-integrity signing keys. For local builds, keep them in `.env.local`. For GitHub Actions, configure them as repository secrets.

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

Required repository secrets:

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `XKEY_INTEGRITY_PUBLIC_KEY_PEM`
- `XKEY_INTEGRITY_PRIVATE_KEY_PEM`

Example:

```bash
git tag v5.10.3
git push origin v5.10.3
```

Generated release files:

- `xKey-GitHub-v5.10.3.apk` using package `com.haivcon.xkey`
- `xKey-GooglePlay-v5.10.3.aab` using package `com.haivcon.xkey`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, backup passwords, Shamir shares, Android signing keys, or `XKEY_INTEGRITY_PRIVATE_KEY_PEM`.
- Keep the runtime-integrity key pair stable across releases unless you intentionally rotate it and rebuild all release artifacts.
- Hardware-bound mode increases device binding but makes working backups more important.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- CSV export may expose sensitive data in plain text if private key or seed phrase columns are selected.
- Clipboard auto-clear and screen capture blocking are best-effort and may be limited by the operating system.
- Secure display and startup integrity checks reduce exposure but cannot protect against a fully compromised device, camera recording, OCR, malicious accessibility services, or a malicious OS that can perfectly emulate correct cryptographic test outputs.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
