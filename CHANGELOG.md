# Changelog

All notable changes to this project are documented here.

## [5.18.2] - Current Release

### Release Focus

v5.18.2 includes significant UI layout improvements for wider screens, theme application fixes, and additional vanity preset groups with icons. 

### Upgraded Features

- **Wider screen UI scaling:** Increased maximum widths for the Dashboard View and Create Wallet Modal to better utilize ultra-wide screens (up to 140rem max-width).
- **Theme application fixes:** The `ThemeContext` now properly applies dark mode themes ('dark', 'theme-dark', 'theme-amoled') and removes old legacy classes. A Tailwind v4 custom variant (`@custom-variant dark`) was added to `src/index.css` to properly support dark mode utilities.
- **Vanity Preset Groups:** The vanity generation presets now include distinct icons and utilize localized keys for labels. Custom pattern inputs were added.
- **Expanded Vanity Settings:** Expanded options for creating vanity wallets, including support for adding arrays of custom patterns.
- **Vanity Performance Refinements:** Calculation for estimated time to discover vanity addresses has been improved by factoring in generation mode overhead (`privateKey` vs `mnemonic` 12/24 words).
- **UI Tweaks:** Minor visual improvements such as using `surface-50` for light overlays instead of `white` in dark mode elements within the Create Wallet Modal.
- **Translation updates:** Extensive sync and expansion of UI translation keys across 15+ locales (ar, de, en, es, fr, hi, id, ja, ko, pt, ru, th, tr, vi, zh).
- **Android release metadata:** Updated Android app metadata to `versionCode 82` and `versionName 5.18.2`.

### Verification

- `npm run build`
- `npx cap sync android`

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

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