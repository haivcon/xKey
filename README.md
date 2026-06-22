<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>A private, offline-first cold vault for managing Web3 wallets, secrets, backups, Shamir QR recovery, and local audit history.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

<br />

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, folders, tags, QR workflows, CSV files, manual balances, encrypted portable backups, and local security history.

The app is designed as a private cold-vault style manager, not a network-connected trading wallet. Source code: `github.com/haivcon/xKey`.

---

## Current Release: v5.12.0

v5.12.0 focuses on backup safety, Android file-export reliability, Shamir QR usability, audit-log polish, full localization coverage, and post-TypeScript hardening.

### Main Upgrades

- **Professional Android file export:** `.xkey`, CSV, and Shamir QR HTML exports use a native Android save flow so users can choose the destination and file name instead of relying only on the share sheet.
- **Verified portable backups:** after exporting a `.xkey` file, xKey can verify the saved file location, hash, metadata, backup ID, wallet count, and integrity state.
- **Tamper-evident `.xkey` preview:** backup restore now shows metadata before import, including source device, creation time, wallet/folder/network counts, full file hash, backup ID, external-app warning, and copy buttons for verification.
- **Verify-only restore flow:** external `.xkey` files can be opened and verified without importing, with a copyable verification report.
- **Self-healing backup format:** portable backups use the current container format with metadata, encrypted payload, recovery footer, and Reed-Solomon 10+5 shard recovery.
- **Safer restore decisions:** restore preview compares the backup with the current vault and supports Merge, Replace, and Verify only paths.
- **Shamir QR improvements:** Shamir QR codes can be enlarged with one tap, copied, printed, shared, saved as named HTML files, and reviewed more comfortably on mobile.
- **Audit Log redesign:** the Audit Log tab now separates protected security audit entries from local action history, shows compact summaries, category filters, counts, and a shorter expandable history list.
- **Localized action history:** toast/action history entries now store translation keys where possible, reducing mixed-language history after switching languages.
- **Language-switch polish:** changing the app language no longer triggers unnecessary device-lock authentication.
- **Light-theme readability:** warning, backup, import, and notice panels have improved contrast in light mode.
- **Input keyboard ergonomics:** password and text inputs scroll into view when the Android keyboard opens, reducing hidden fields in modal dialogs.
- **Security and device guard polish:** Root/Data Tamper Guard, hardware-bound vault notes, external backup warnings, secure display labels, and restore/import messages have improved localization.
- **Full locale coverage:** new UI strings are translated across `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, and `zh`.

### Verification for This Release

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npx cap sync android`
- `android\gradlew.bat assembleDebug`

---

## Core Features

### Security and Privacy

- Offline encrypted local vault.
- Android Device Credential unlock, Android Keystore integration, web fallback unlock, and optional hardware-bound vault key mode.
- Signed runtime integrity manifest, offline crypto KAT startup checks, optional Root/Data Tamper Guard, and secure display rendering.
- Screen capture blocking, clipboard auto-clear, auto-lock, decoy vault, kill switch, and protected audit log.
- Encrypted portable `.xkey` backups with metadata, tamper detection, verify-only preview, and recovery footer.
- Shamir Secret Sharing QR backups for single-wallet paper/offline recovery.

### Wallet and Data Management

- Folder and tag organization, search, filters, sorting, and batch actions.
- QR scan/display/share workflows and CSV import/export.
- Vanity wallet generation, manual asset balance tracking, and configurable wallet density.
- Multi-language UI: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

---

## Previous Release Highlights

- **v5.11.0:** completed the strict TypeScript migration and typed security-critical backup, storage, key, and build paths.
- **v5.10.x:** introduced self-healing Reed-Solomon storage, tamper-evident backup previews, encrypted audit logs, Android `.xkey` open handling, runtime integrity checks, and Root/Data Tamper Guard.
- **Older releases:** added hardware-bound vault mode, secure glyph display, scrambled keyboard, Shamir backup/restore, folders, tags, vanity tools, QR workflows, CSV import/export, manual balances, decoy vault, kill switch, native clipboard, and haptics.

Detailed older notes are kept in [CHANGELOG.md](./CHANGELOG.md).

---

## Tech Stack

- React 19
- Vite 8
- TypeScript strict mode
- Capacitor 8 for Android
- Node.js 22+
- Java 21+

---

## Development

```bash
npm install
npm run type-check
npm run lint
npm run build
```

For Android:

```bash
npm run sync
android\gradlew.bat -p android assembleDebug
```

Production builds require runtime-integrity signing keys. Use `.env.local` locally and GitHub Actions repository secrets in CI:

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `XKEY_INTEGRITY_PUBLIC_KEY_PEM`
- `XKEY_INTEGRITY_PRIVATE_KEY_PEM`

---

## Release Workflow

GitHub Actions builds and signs release artifacts when a `v*` tag is pushed.

```bash
git tag v5.12.0
git push origin v5.12.0
```

Generated artifacts:

- `xKey-GitHub-v5.12.0.apk`
- `xKey-GooglePlay-v5.12.0.aab`

Android package: `com.haivcon.xkey`.

---

## Security Notice

> [!WARNING]
> Never share private keys, seed phrases, `.xkey` backup files, backup passwords, Shamir shares, Android signing keys, or `XKEY_INTEGRITY_PRIVATE_KEY_PEM`.

xKey stores vault data locally and is designed for offline use. Startup integrity checks, secure displays, tamper guards, recovery metadata, and audit logs improve safety, but no app can fully protect against a completely compromised OS, malicious root access, device-owner abuse, or physical camera recording.

---

## Links

- Website: [xlayer.my](https://xlayer.my)
- X: [@haivcon](https://x.com/haivcon)
- Telegram: [@haivcon](https://t.me/haivcon)

## License

MIT License
