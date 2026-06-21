# xKey - Offline Web3 Wallet Vault

![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

## Current Release: v5.10.4

### Release Focus

v5.10.4 expands xKey's local vault hardening with self-healing backup/vault storage, tamper-evident backup previews, encrypted immutable audit logs, Android `.xkey` file-open handling, and an optional Root/Data Tamper Guard. The release focuses on detecting risky device states and corrupted or modified backup files before sensitive vault data is opened or imported.

### Backup Integrity and Self-Healing

- **Reed-Solomon vault recovery**: encrypted vault data now uses 10 data shards plus 5 parity shards, allowing recovery from multiple damaged shards before decrypting.
- **Self-healing backup payloads**: portable `.xkey` backups include parity metadata so xKey can repair recoverable corruption and report recovered bytes or shards.
- **Container-based `.xkey` format**: backups now use the `xkey-backup-v4` container with a readable header, encrypted payload, and recovery footer. The footer lets xKey still preview metadata when the main header is damaged.
- **Tamper-evident backup verification**: imports inspect backup metadata, payload hashes, container hashes, password seals, and recovery status before accepting the file.
- **Verify-only flow**: users can inspect a backup's created time, source device, wallet count, folder count, network count, backup ID, file hash, integrity state, and recovered shard count without importing it.
- **Verification report copy**: the backup preview can copy a concise verification report for offline review or support.

### Audit Log and External File Handling

- **Immutable local audit log**: xKey records security-sensitive events in an encrypted hash-chain log, including app open, unlock, backup import/export, verify-only checks, self-healing events, and tamper detections.
- **Protected audit viewer**: `Settings > Audit Log` requires device authentication before showing local security history.
- **Android `.xkey` open intent**: tapping a `.xkey` file from another app can open xKey directly and show the backup preview.
- **External-source warning**: backups opened from another Android app are clearly marked as external before import.
- **Pending external backup indicator**: after unlock, xKey shows when one external backup file is waiting for review.
- **ADB intent test script**: `npm run test:adb-open` can verify Android file-open behavior on a connected device.

### Device and Runtime Guard

- **Root/Data Tamper Guard**: a new Security setting can block vault access when Android root traces, `su`, test-keys, a debuggable app build, or enabled ADB are detected.
- **Startup enforcement**: when the guard is enabled and the device looks risky, xKey stops before opening the vault and writes `device_integrity.blocked` to the audit log.
- **Non-blocking default**: the guard is off by default so existing users are not unexpectedly locked out.
- **Clear limitation notice**: the UI explains that Android apps cannot fully prevent root users, device owners, or system settings from deleting app data; the guard detects risky runtime conditions and blocks vault access when enabled.
- **Native timeout hardening**: root command detection uses a short timeout so unusual ROM behavior cannot freeze startup.

### Localization and Settings UX

- Vietnamese and English strings were added for the new Root/Data Tamper Guard, device-risk reasons, external backup warnings, verify-only backup actions, recovery footer notices, and copied verification reports.
- Security settings now include a dedicated Root/Data Tamper Guard toggle with expandable details and current risk status.
- Backup preview now displays `backupId` and `containerHash` to help users distinguish real backups from lookalike files.

Supported UI languages remain:

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

### Release Metadata

- Web/package version: `5.10.4`
- Android `versionName`: `5.10.4`
- Android `versionCode`: `68`
- Git tag for release build: `v5.10.4`

## Quality Checks

The following checks were run before this release:

```bash
npm run lint
npm run test:smoke
node tests/reed-solomon.test.mjs
npm run build
npx cap sync android
android/gradlew -p android assembleDebug
```

Additional verification performed for this release:

- Root/Data Tamper Guard wiring verified in smoke tests across native plugin registration, React settings UI, and startup enforcement.
- Reed-Solomon recovery verified for 10 data shards plus 5 parity shards.
- Android `.xkey` file-open ADB script is available and skips cleanly when no device is connected.
- Android debug APK compilation verified with the new native Device Integrity plugin.

The Vite production build may still report a large chunk warning. This is not a runtime failure, but future releases should continue splitting scanner and advanced tooling into smaller lazy-loaded chunks.

## Core Features

**Security & Privacy**

- Offline encrypted wallet vault with local AES-protected storage
- Android Device Credential unlock, Android Keystore integration, and web fallback authentication
- Optional hardware-bound vault key mode for Android
- Signed runtime integrity manifest, offline crypto KAT startup checks, and optional Root/Data Tamper Guard
- Tamper-evident `.xkey` backup preview with verify-only reporting
- Self-healing Reed-Solomon vault and backup recovery
- Encrypted immutable audit log with protected viewer
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
<summary><b>v5.10.3 and earlier summary</b></summary>

- v5.10.3 added signed runtime integrity checks, offline crypto KATs, manifest source binding to `github.com/haivcon/xKey`, and release workflow support for integrity signing keys.
- v5.10.2 improved security settings UX, hardware-bound backup guidance, light-theme warning contrast, Data-tab Danger Zone placement, folder action menus, and locale coverage.
- v5.10.1 introduced hardware-bound vault mode, Android screen-capture controls, secure glyph display, scrambled keyboard options, fragmented encrypted vault storage, and expanded Security settings explanations.
- v5.9.x and earlier added Settings navigation, backup UX, Shamir backup/restore, Android/Capacitor support, folders, tags, vanity tools, QR workflows, CSV import/export, manual balances, decoy vault, kill switch, and native clipboard/haptics.
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
git tag v5.10.4
git push origin v5.10.4
```

Generated release files:

- `xKey-GitHub-v5.10.4.apk` using package `com.haivcon.xkey`
- `xKey-GooglePlay-v5.10.4.aab` using package `com.haivcon.xkey`

## Security Notice

- Never share private keys, seed phrases, `.xkey` backup files, backup passwords, Shamir shares, Android signing keys, or `XKEY_INTEGRITY_PRIVATE_KEY_PEM`.
- Keep the runtime-integrity key pair stable across releases unless you intentionally rotate it and rebuild all release artifacts.
- Hardware-bound mode increases device binding but makes working backups more important.
- Removing or changing the device screen lock can invalidate Android Keystore-backed authentication keys.
- CSV export may expose sensitive data in plain text if private key or seed phrase columns are selected.
- Clipboard auto-clear and screen capture blocking are best-effort and may be limited by the operating system.
- Secure display, startup integrity checks, self-healing storage, tamper-evident backups, and Root/Data Tamper Guard reduce exposure but cannot protect against a fully compromised device, camera recording, OCR, malicious accessibility services, root users with full device control, or a malicious OS that can perfectly emulate correct cryptographic test outputs.
- xKey stores vault data locally and is designed for offline use.

## License

MIT License
