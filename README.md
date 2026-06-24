<div align="center">
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>NOT YOUR KEY, NOT YOUR CRYPTO</strong></p>

  <p><strong>A private, offline-first cold vault for Web3 wallets, private keys, seed phrases, encrypted backups, Shamir QR recovery, local audit history, and advanced vanity wallet generation.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

<br />

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, folders, tags, QR workflows, CSV files, manual balances, encrypted portable backups, local security history, and offline vanity wallet generation.

The app is designed as a private cold-vault style manager, not a network-connected trading wallet. Source code: `github.com/haivcon/xKey`.

---

## Current Release: v5.18.1

v5.18.1 is a release metadata, Android build, and documentation refresh for the current advanced vanity-wallet generation upgrade. It keeps the v5.18 feature set focused on safer long-running scans, better visibility of generated addresses, secure reveal/copy flows, and clearer multilingual guidance.

### Main Upgrades

- **Advanced vanity match discovery:** The vanity worker can retain extra high-value addresses that match mathematical patterns such as forward and reverse sequences, dual-end repetitions, symmetry, palindromes, alternating patterns, and bracket-style matches.
- **Larger match viewer:** Generated vanity addresses are shown in expanded scrollable lists with middle truncation so both the prefix and suffix remain visible on narrow and wide screens.
- **Secure result details:** Private keys and seed phrases in vanity results remain hidden by default and require an explicit reveal action before copy operations.
- **Individual and bulk save actions:** Users can save discovered vanity wallets one by one or in bulk and route them directly into a selected vault folder.
- **Configurable secondary wallet reserve:** Users can choose how many extra beautiful secondary matches should be retained during a scan, with safe limits to protect memory usage.
- **CPU and heat safety guidance:** The UI now explains why long-running vanity generation can heat the device, affect battery health, and require cooling breaks or reduced workload.
- **Theme and layout improvements:** Light/dark contrast, generator metrics, status indicators, address display, and responsive spacing were refined.
- **Localization refresh:** Vanity, pause/resume, folder routing, heat warning, and advanced match descriptions were synchronized across supported locales.
- **Android release metadata:** Android version metadata is updated to `versionCode 81` and `versionName 5.18.1`.
- **Release documentation refresh:** README, changelog, security, contributing, code of conduct, architecture, and git ignore rules were updated for the current release while older release notes are collapsed.

### Verification for This Release

Run before publishing:

```bash
npm run lint
npm run type-check
npm run test:vanity
npm run build
npx cap sync android
```

### Store Listing Copy

Short description:

```text
Offline wallet vault. NOT YOUR KEY, NOT YOUR CRYPTO.
```

Long description opener:

```text
xKey is an offline-first Web3 wallet vault for people who want direct local control of wallet keys, encrypted backups, audit history, Shamir QR recovery, and advanced vanity wallet generation. NOT YOUR KEY, NOT YOUR CRYPTO.
```

---

## Core Features

### Security and Privacy

- Offline encrypted local vault.
- Android Device Credential unlock, Android Keystore integration, web fallback unlock, and optional hardware-bound vault key mode.
- Signed runtime integrity manifest, offline crypto KAT startup checks, optional Root/Data Tamper Guard, and secure display rendering.
- Screen capture blocking, clipboard auto-clear, auto-lock, decoy vault, kill switch, and protected audit log.
- Encrypted portable `.xkey` backups with metadata, tamper detection, verify-only preview, and recovery footer.
- Shamir Secret Sharing QR backups for single-wallet paper/offline recovery.
- No account system, no cloud sync, and no telemetry requirement.

### Wallet and Data Management

- Folder and tag organization, search, filters, sorting, and batch actions.
- QR scan/display/share workflows and CSV import/export.
- Manual asset balance tracking and configurable wallet density.
- Advanced vanity wallet generation with explicit CPU/heat warnings.
- Multi-language UI: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

### Vanity Wallet Generation

The vanity generator is intended for offline address discovery. It can scan for user-provided patterns and retain additional mathematically interesting results. Long scans are CPU intensive. Users should:

- Keep the device cool and ventilated.
- Avoid running scans while charging on hot surfaces.
- Pause scans if the device becomes uncomfortable to touch.
- Use lower reserve limits on low-memory devices.
- Treat every generated private key and seed phrase as secret material.

---

## Build

```bash
npm install
npm run lint
npm run type-check
npm run test:vanity
npm run build
npx cap sync android
```

Android release builds are triggered by GitHub tags matching `v*`.

---

## Earlier Releases

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

### v5.18.0

- Introduced expanded vanity result visibility.
- Added secure reveal/copy details for generated private keys and seed phrases.
- Added individual/bulk save actions and folder routing.
- Added advanced mathematical vanity match discovery.
- Added configurable reserve limits for extra beautiful wallet matches.
- Improved light/dark theme compatibility.

### v5.17.x and older

Earlier releases focused on startup integrity, encrypted backup reliability, Shamir QR recovery, Reed-Solomon resilience, Android Back handling, UI responsiveness, localization, and the initial advanced vanity-wallet workflow.

</details>

---

## Security

Read [SECURITY.md](./SECURITY.md) before storing real funds or sensitive seed phrases. xKey cannot recover encrypted vault data without your device key, backup password, or valid recovery material.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening issues or pull requests. Security vulnerabilities must be reported privately.