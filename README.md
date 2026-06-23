<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for managing Web3 wallets, secrets, backups, Shamir QR recovery, and local audit history.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

<br />

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, folders, tags, QR workflows, CSV files, manual balances, encrypted portable backups, and local security history.

The app is designed as a private cold-vault style manager, not a network-connected trading wallet. Source code: `github.com/haivcon/xKey`.

---

## Current Release: v5.14.0

v5.14.0 introduces native Hierarchical Deterministic (HD) BIP39 Wallet support, enabling secure storage of multiple master seed phrases, support for both 12 and 24-word mnemonic phrases, off-main-thread encryption/decryption, and an interactive derivation tree visualizer in the creation modal.

### Main Upgrades

- **BIP39 HD Seed Phrase Storage:** Master seeds are securely stored and isolated in the encrypted vault (`hdStorage.ts`). Only the master seeds are stored, and leaf wallets can be safely derived and added.
- **Support for 12 and 24-Word Seeds:** HD derivation tree visualizer updated to support importing/generating both 12-word and 24-word mnemonic seeds.
- **Background Crypto Worker Integration:** BIP39 key derivation and master seed encryption/decryption are processed off-main-thread via the dedicated background worker to ensure optimal app performance.
- **HD Wallet Derivation Visualizer:** Provides interactive derivation UI tree allowing users to inspect addresses and derive keys cleanly.
- **Android sync-ready release:** Android metadata version code updated to 76 and version name to 5.14.0.

### Verification for This Release

- `npm run lint`
- `npm run type-check`
- `npm run locale:audit`
- `npm run test:key-health`
- `npm run test:shamir`
- `npm run test:reed-solomon`
- `npm run test:vanity`
- `npm run build`
- `npm run test:smoke`

### Store Listing Copy

Short description:

`Offline wallet vault. NOT YOUR KEY, NOT YOUR CRYPTO.`

Long description opener:

`xKey is an offline-first Web3 wallet vault for people who want direct local control of wallet keys, backups, audit history, and recovery files. NOT YOUR KEY, NOT YOUR CRYPTO.`

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

## Earlier Releases

- **v5.14.0:** BIP39 Hierarchical Deterministic (HD) Wallet support, 12 and 24-word mnemonic keys, background derivation worker, and interactive derivation visualizer tree.
- **v5.13.0:** Key Health center for long-term maintenance, post-quantum preparation metadata, key-rotation reminders, and scoped Proof-of-Keys checks.
- Previous releases established offline vault security, encrypted backups, recovery, audit logs, QR workflows, Android file handling, vanity wallet generation, recovery-session safety, and the TypeScript migration foundation.

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
git tag v5.14.0
git push origin v5.14.0
```

Generated artifacts:

- `xKey-GitHub-v5.14.0.apk`
- `xKey-GooglePlay-v5.14.0.aab`

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
