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

## Current Release: v5.17.0

v5.17.0 focuses on **Advanced Vanity Wallet Generation**, significantly improving the vanity wallet generator's pattern matching capabilities, UI/UX, and saving options.

### Main Upgrades

- **Advanced Vanity Pattern Matching:** Upgraded the vanity worker to detect high-value multi-patterns including full symmetry, forward/backward sequences, and dual-end repetitions.
- **Improved UI/UX & Visibility:** Fixed light/dark theme contrast issues, optimized wallet address truncation for ultra-wide screens to keep endings visible, and added secure view/copy toggles for private keys and seed phrases.
- **Customizable Saving:** Users can now input a custom quantity of extra vanity wallets to save during generation runs.
- **Android sync-ready release:** Android metadata version code updated to 79 and version name to 5.17.0.

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

<details>
<summary>Click to expand previous release history</summary>

- **v5.16.0:** Locale and translations fixes for the new Create Wallet interfaces, specifically addressing cross-contamination and missing translations across all supported languages.
- **v5.15.0:** Advanced Entropy Generation (Pointer/Movement, Physical Dice, BIP85 Deterministic Derivation), with complete UI integrations and multilingual support.
- **v5.14.0:** BIP39 Hierarchical Deterministic (HD) Wallet support, 12 and 24-word mnemonic keys, background derivation worker, and interactive derivation visualizer tree.
- **v5.13.0:** Key Health center for long-term maintenance, post-quantum preparation metadata, key-rotation reminders, and scoped Proof-of-Keys checks.
- Previous releases established offline vault security, encrypted backups, recovery, audit logs, QR workflows, Android file handling, vanity wallet generation, recovery-session safety, and the TypeScript migration foundation.

</details>

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
git tag v5.17.0
git push origin v5.17.0
```

Generated artifacts:

- `xKey-GitHub-v5.17.0.apk`
- `xKey-GooglePlay-v5.17.0.aab`

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
