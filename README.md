<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>A private, offline-first cold vault for managing Web3 wallets, secrets, backups, and local audit history.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

<br />

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, CSV files, manual balances, and encrypted backups in a local app.

The app is designed as a private cold-vault style manager, not a network-connected trading wallet. Source code: `github.com/haivcon/xKey`.

---

## Current Release: v5.11.0

v5.11.0 completes the full TypeScript migration and enables strict TypeScript checking across the app. It also keeps the recent vault-hardening work focused on backup integrity, self-healing storage, Android file-open handling, and local auditability.

### Main Upgrades
- **Strict TypeScript migration:** all application source files now use `.ts` or `.tsx`; JavaScript source checking is disabled with `allowJs: false`, and `strict: true` is enabled.
- **Typed security-critical flows:** backup parsing, `.xkey` container inspection, Reed-Solomon recovery, vault fragment storage, biometric/fallback key retrieval, wallet save/load, and settings encryption now have stronger static typing.
- **Typed build tooling:** `vite.config.ts` is included in TypeScript checks and the runtime-integrity manifest build plugin is typed.
- **Type-check workflow:** `npm run type-check` runs `tsc --noEmit`; Shamir and Reed-Solomon tests run through `tsx` against TypeScript source.
- **Backup integrity hardening:** `.xkey` backups use a container with metadata, encrypted payload, recovery footer, `backupId`, `containerHash`, integrity verification, and verify-only preview support.
- **Self-healing recovery:** vault and backup recovery use Reed-Solomon 10 data shards plus 5 parity shards to recover multiple damaged shards when enough healthy shards remain.
- **Audit and device guard features:** encrypted audit history, external backup warnings, pending external backup indication, and optional Root/Data Tamper Guard remain part of the current security surface.

Older release details are intentionally summarized in [CHANGELOG.md](./CHANGELOG.md).

---

## Core Features

### Security and Privacy
- Offline encrypted local vault.
- Android Device Credential unlock, Android Keystore integration, web fallback unlock, and optional hardware-bound vault key mode.
- Signed runtime integrity manifest, offline crypto KAT startup checks, optional Root/Data Tamper Guard, and secure display rendering.
- Screen capture blocking, clipboard auto-clear, auto-lock, decoy vault, kill switch, and protected audit log.
- Shamir Secret Sharing backups and encrypted portable `.xkey` backup files.

### Wallet and Data Management
- Folder and tag organization, search, filters, sorting, and batch actions.
- QR scan/display/share workflows and CSV import/export.
- Vanity wallet generation, manual asset balance tracking, and configurable wallet density.
- Multi-language UI: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

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
npm run test:smoke
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
git tag v5.11.0
git push origin v5.11.0
```

Generated artifacts:
- `xKey-GitHub-v5.11.0.apk`
- `xKey-GooglePlay-v5.11.0.aab`

Android package: `com.haivcon.xkey`.

---

## Security Notice

> [!WARNING]
> Never share private keys, seed phrases, `.xkey` backup files, backup passwords, Shamir shares, Android signing keys, or `XKEY_INTEGRITY_PRIVATE_KEY_PEM`.

xKey stores vault data locally and is designed for offline use. Startup integrity checks, secure displays, tamper guards, and recovery metadata improve safety, but no app can fully protect against a completely compromised OS, malicious root access, device-owner abuse, or physical camera recording.

---

## Links
- Website: [xlayer.my](https://xlayer.my)
- X: [@haivcon](https://x.com/haivcon)
- Telegram: [@haivcon](https://t.me/haivcon)

## License
MIT License
