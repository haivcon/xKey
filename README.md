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

## Current Release: v5.12.2

v5.12.2 focuses on reliable startup, safer long-running vanity-wallet generation, responsive backup restore controls, and Android lifecycle hardening.

### Main Upgrades

- **Startup deadlock recovery:** React Strict Mode no longer leaves the app stuck on the animated splash screen after a cancelled first integrity-effect subscription.
- **Bounded startup integrity checks:** each asset request has a short timeout, the complete check has a hard timeout, outstanding asset requests are aborted on timeout, and verification is limited to two concurrent assets to reduce startup CPU and memory spikes.
- **Responsive backup restore dialog:** restore metadata uses more of the available device width, scrolls safely within the viewport, ignores backdrop taps, and wraps long localized actions instead of clipping them.
- **Safer Android back handling:** Android Back now invokes the same safe close flow as the modal close button while vanity generation is active.
- **Professional vanity workspace:** active vanity generation collapses the setup form into a progress workspace with cumulative scan metrics, a bounded live terminal, highlighted matches, copy controls, selectable results, and explicit pause/resume/stop controls.
- **Reliable pause and resume:** vanity workers preserve cumulative scan count and elapsed time across pause/resume, so time limits and progress remain accurate.
- **No lost selected results:** matching wallets remain available until the user starts over; selected wallets can be saved after a stop without duplicate writes.
- **Validated remembered settings:** the app restores only valid vanity time limits and available folders, while remembering the last non-sensitive network, folder, quantity, and time-limit choices.

### Verification for This Release

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npx cap sync android`
- `android\gradlew.bat assembleDebug`

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

## Previous Release Highlights

- **v5.12.1:** established slogan-first product identity, branded backup and Shamir QR surfaces, and localized reminder controls.
- **v5.12.0:** delivered verified native backup export, detailed restore preview, Reed-Solomon recovery, audit-log polish, and Android file workflows.
- **v5.11.0 and earlier:** completed strict TypeScript migration and introduced the offline vault, backup, audit, Shamir, QR, vanity, security, and Android native foundations.

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
git tag v5.12.2
git push origin v5.12.2
```

Generated artifacts:

- `xKey-GitHub-v5.12.2.apk`
- `xKey-GooglePlay-v5.12.2.aab`

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
