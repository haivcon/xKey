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

## Current Release: v5.12.1

v5.12.1 focuses on xKey's product identity, slogan placement, Android UI polish, Shamir QR printed backup branding, and full localization for the new brand reminders.

### Main Upgrades

- **Slogan-first brand identity:** xKey now consistently uses **NOT YOUR KEY, NOT YOUR CRYPTO** as the primary security message.
- **Animated home header slogan:** the slogan appears in the unused space below the version badge and above the folder bar, using a subtle letter-by-letter glow without increasing header height or shrinking the wallet list.
- **Reusable brand component:** added a shared BrandSlogan UI component and a centralized slogan constant so the phrase stays consistent across screens.
- **Contextual brand reminders:** sensitive screens such as lock, backup, restore, CSV export, empty vault, and wallet secret-copy warnings can show the slogan when reminders are enabled.
- **User-controlled reminders:** Settings now includes a localized toggle for security slogan reminders; Splash, About, README, and printed materials keep the core brand line.
- **About screen upgrade:** the About tab presents the slogan as a larger centered brand statement with a clearer product description.
- **Backup and CSV polish:** slogan blocks in backup and CSV flows are centered with cleaner spacing and translated explanatory text.
- **Shamir QR watermarking:** Shamir QR UI, print sheets, and saved HTML now include xKey branding, slogan, backup ID, creation time, and safety context.
- **Store listing copy:** README now includes short and long Google Play listing copy that uses the slogan.
- **Full locale coverage:** all new brand-reminder text is translated across `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, and `zh`.

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

- **v5.12.0:** added native Android save flow, verified `.xkey` backup metadata, verify-only restore previews, copyable backup IDs/file hashes, Reed-Solomon 10+5 backup recovery, Shamir QR zoom/save improvements, audit-log redesign, keyboard ergonomics, light-theme contrast fixes, and full localization for those flows.
- **v5.11.0:** completed the strict TypeScript migration and typed security-critical backup, storage, key, and build paths.
- **v5.10.x:** introduced self-healing storage, tamper-evident backup previews, encrypted audit logs, Android `.xkey` open handling, runtime integrity checks, and Root/Data Tamper Guard.
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
git tag v5.12.1
git push origin v5.12.1
```

Generated artifacts:

- `xKey-GitHub-v5.12.1.apk`
- `xKey-GooglePlay-v5.12.1.aab`

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
