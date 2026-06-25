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

## Current Release: v5.19.0

v5.19.0 introduces a comprehensive UI/UX overhaul of the Vanity Wallet generation process, transforming it into a structured, step-by-step professional wizard while retaining the original expandable architecture.

### Main Upgrades

- **Vanity Wallet UI Redesign:** Reorganized the Vanity Wallet creation modal into a 5-step intuitive workflow (Key Source, Pattern, Storage, Performance, and Secondary Wallets).
- **Visual Enhancements:** Introduced unified status badges (e.g., Easy, FAST, ON) for quick configuration checks, improved accordion headers with softer borders and gradients.
- **Progress Tracking:** Added a visual progress indicator inside the modal to guide users through the setup process.
- **Improved Call-to-Action:** Elevated the primary action button for starting the vanity search with prominent styling and explicit action text.
- **Code Optimization:** Applied structural UI changes in `CreateWalletModal.tsx` and visual refinements in `App.tsx` and `index.css`.
- **Android release metadata:** Android version metadata is updated to `versionCode 83` and `versionName 5.19.0`.
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

### v5.18.2

- Wider screen UI scaling.
- Theme application fixes and Tailwind v4 custom variants.
- Vanity Preset Groups with icons.
- Expanded Vanity Settings.
- Vanity Performance Refinements.

### v5.18.1

- Refreshed Android release metadata, documentation, and publish notes for the advanced vanity-wallet generation upgrade.
- Emphasized safer long-running scans, improved visibility for generated addresses, explicit secure reveal/copy actions.

### v5.18.0

- Expanded vanity result viewer with better address visibility.
- Added hidden-by-default private key and seed phrase details for generated vanity wallets.
- Added individual and bulk save actions with folder routing.
- Added advanced mathematical pattern discovery for beautiful secondary matches.
- Added configurable reserve limits for retained secondary matches.
- Improved light/dark theme compatibility in vanity generator views.

### v5.17.x and older

Earlier releases focused on startup integrity, encrypted backup reliability, Shamir QR recovery, Reed-Solomon resilience, Android Back handling, UI responsiveness, localization, and the initial advanced vanity-wallet workflow.

</details>

---

## Security

Read [SECURITY.md](./SECURITY.md) before storing real funds or sensitive seed phrases. xKey cannot recover encrypted vault data without your device key, backup password, or valid recovery material.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening issues or pull requests. Security vulnerabilities must be reported privately.