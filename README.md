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

## Current Release: v5.13.0

v5.13.0 adds a Key Health center for long-term cold-vault maintenance, post-quantum preparation metadata, key-rotation reminders, and scoped Proof-of-Keys draft-signature checks.

### Main Upgrades

- **Key Health center:** a home-screen bell opens a focused maintenance view for wallet age, rotation status, PQ-ready status, Proof-of-Keys results, and follow-up actions.
- **Post-quantum preparation beta:** wallet creation can generate a local one-time-signature reserve and public commitment for future migration workflows. The UI clearly states that this does not make current Bitcoin, Ethereum, or EVM transactions quantum-safe today.
- **Separated PQ reserve storage:** new wallets keep only `pqReserveId` and public commitment metadata in the wallet record. PQ reserve material is stored separately and encrypted with the vault key.
- **Key rotation workflow:** wallets can be marked reviewed, snoozed for 30 days, or used as a starting point for creating a replacement wallet.
- **Scoped Proof-of-Keys checks:** users can run local draft-signature checks for all wallets, visible wallets, signable wallets, or only wallets that need attention.
- **Detailed Proof-of-Keys reports:** checks now produce pass/fail/skipped details with a copyable report and audit-log entry. No blockchain transaction is created or broadcast.
- **Test coverage:** a dedicated `test:key-health` script covers rotation status, snooze/review behavior, PQ envelope metadata, proof check pass/fail/skipped states, and scope selection.
- **Android sync-ready release:** Android metadata is now version code 75 and version name 5.13.0.

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

Previous releases established offline vault security, encrypted backups, recovery, audit logs, QR workflows, Android file handling, vanity wallet generation, recovery-session safety, and the TypeScript migration foundation.

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
git tag v5.13.0
git push origin v5.13.0
```

Generated artifacts:

- `xKey-GitHub-v5.13.0.apk`
- `xKey-GooglePlay-v5.13.0.aab`

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
