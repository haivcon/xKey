# Changelog

All notable changes to this project are documented here.

## [5.19.0] - Current Release

### Release Focus

v5.19.0 introduces a comprehensive UI/UX overhaul of the Vanity Wallet generation process, transforming it into a structured, step-by-step professional wizard while retaining the original expandable architecture.

### Upgraded Features

- **Vanity Wallet UI Redesign:** Reorganized the Vanity Wallet creation modal into a 5-step intuitive workflow (Key Source, Pattern, Storage, Performance, and Secondary Wallets).
- **Visual Enhancements:** Introduced unified status badges (e.g., Easy, FAST, ON) for quick configuration checks, improved accordion headers with softer borders and gradients.
- **Progress Tracking:** Added a visual progress indicator inside the modal to guide users through the setup process.
- **Improved Call-to-Action:** Elevated the primary action button for starting the vanity search with prominent styling and explicit action text.
- **Code Optimization:** Applied structural UI changes in `CreateWalletModal.tsx` and visual refinements in `App.tsx` and `index.css`.
- **Android & App Metadata:** Updated version to `5.19.0` (versionCode 83).
- **Documentation:** Minimized older documentation sections and highlighted the new vanity design flow across all project specs.

### Verification

- `npm run build`
- `npx cap sync android`

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

## [5.18.2]
- Wider screen UI scaling.
- Theme application fixes and Tailwind v4 custom variants.
- Vanity Preset Groups with icons.
- Expanded Vanity Settings.
- Vanity Performance Refinements.

## [5.18.1]
- Refreshed Android release metadata, documentation, and publish notes for the advanced vanity-wallet generation upgrade.
- Emphasized safer long-running scans, improved visibility for generated addresses, explicit secure reveal/copy actions.

## [5.18.0]
- Expanded vanity result viewer with better address visibility.
- Added hidden-by-default private key and seed phrase details for generated vanity wallets.
- Added individual and bulk save actions with folder routing.
- Added advanced mathematical pattern discovery for beautiful secondary matches.
- Added configurable reserve limits for retained secondary matches.
- Improved light/dark theme compatibility in vanity generator views.

## [5.17.x and older]
- Improved startup integrity checks, timeout behavior, and signed asset verification.
- Hardened encrypted `.xkey` backups with metadata, tamper detection, and recovery footer handling.
- Added Shamir Secret Sharing QR recovery and Reed-Solomon resilience.
- Improved Android Back handling, restore dialogs, responsive layouts, and localization.
- Added the initial advanced vanity-wallet workflow and worker-based scanning improvements.

</details>