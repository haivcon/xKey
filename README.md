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

## Current Release: v5.12.4

v5.12.4 hardens long-running vanity wallet generation, recovery-session safety, Android lifecycle handling, and localization verification.

### Main Upgrades

- **Ranked extra vanity wallets:** while searching for a main prefix/suffix, xKey can keep a bounded top-N set of addresses with repeated characters at the beginning, end, or both ends. Rankings update as stronger matches appear.
- **Safer scan controls:** closing the generator pauses and encrypts the session; stopping shows results for review instead of silently saving them. Saving failures preserve the recovery session and show a localized error.
- **Resilient Android lifecycle:** active vanity sessions flush encrypted recovery data when the app enters the background. Long scans no longer accumulate every discarded candidate in memory.
- **Consistent final naming:** extra vanity wallets receive names based on their final score rank when saved, not the incidental order in which they were found.
- **Localization and test hardening:** all 15 languages include the new vanity states, locale audit rejects untranslated vanity strings, and a dedicated algorithm test covers head, tail, combined, and ranked repeated-character matches.
- **Android sync-ready release:** Android metadata is now version code 74 and version name 5.12.4.

### Verification for This Release

- `npm run lint`
- `npm run type-check`
- `npm run locale:audit`
- `npm run test:vanity`
- `npm run build`
- `npx playwright test tests/smoke/settings-regression.spec.js`
- `npx cap sync android`

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

Previous releases established offline vault security, encrypted backups, recovery, audit logs, QR workflows, Android file handling, and the TypeScript migration foundation.

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
git tag v5.12.4
git push origin v5.12.4
```

Generated artifacts:

- `xKey-GitHub-v5.12.4.apk`
- `xKey-GooglePlay-v5.12.4.aab`

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
