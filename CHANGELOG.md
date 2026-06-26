# Changelog

All notable changes to this project are documented here.

## [5.21.1] - Current Release

### Release Focus

v5.21.1 resolves a responsive UI issue where compacted vanity addresses failed to accurately resize according to their container width.

### Upgraded Features

- **Vanity Address Responsive Scaling:** Restored accurate, real-time container-width measurement for dynamically generated `HighlightedCompactAddress` components. Vanity addresses with colored prefixes and suffixes now gracefully collapse with middle-ellipses without breaking layout constraints.
- **Fixed Width Calculation Logic:** Replaced the static, absolute character count truncation method with a dynamically resizing layout approach, incorporating `ResizeObserver` for robust viewport changes.
- **App Version Bump:** Bumped app version to `5.21.1` (Android versionCode 86).

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

## [5.21.0]
- Duplicate Detector UI Enhancement: Redesigned the folder location tag with a new "tech blue" color scheme.
- Improved Alignment: Repositioned folder tags to right-align properly within list items.
- App Version Bump: Bumped app version to `5.21.0` (Android versionCode 85).

## [5.20.0]
- Splash Screen Fix: Fixed an issue where the light theme logo would fail to load on the initial boot sequence.
- Vite Asset Resolution: Unified the splash screen logo to always resolve `/logo.png`.
- App Version Bump: Bumped app version to `5.20.0` (Android versionCode 84).

## [5.19.0]
- Vanity Wallet UI Redesign with a 5-step intuitive workflow.
- Introduced unified status badges and a visual progress indicator.
- Code optimizations in `CreateWalletModal.tsx`, `App.tsx`, and `index.css`.

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