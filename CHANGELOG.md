# Changelog

All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.

## [5.22.2] - Current Release

### Release Focus

v5.22.2 refactors the Android display scaling approach to use `smallestScreenWidthDp` (minimum width override) instead of custom density DPI. This allows the app to request a wider tablet-like layout (defaulting to 480dp) independently of system-wide Developer Options.

### Added

- App-only Minimum Width (smallestScreenWidthDp override) setting for Android, allowing users to configure tablet-like layouts (240dp - 800dp).
- Automatically applies 480dp minimum width on fresh installations.
- Stores user preference to opt-out if disabled.

### Changed

- Replaced the former "DPI-balanced display" mechanism which only scaled interface density, but did not trigger wider UI breakpoint logic on Android.
- `ThemeContext` and `GeneralTab` UI labels, presets, and sliders now reflect "dp" instead of "DPI".
- Updated all 15 localization files to clarify the minimum width feature.
- Deprecated the old `add-dpi-locales.mjs` migration script to prevent accidental reversions.

### Release Metadata

- `package.json`: `5.22.2`
- `package-lock.json`: `5.22.2`
- Android `versionName`: `5.22.2`
- Android `versionCode`: `97`

## Previous Releases - Compact Summary

- **5.22.1:** mobile layout balance, total assets privacy toggle, and header reorganization.
- **5.22.0:** version metadata update before the mobile layout polish release.
- **5.21.9:** privacy mode, wallet card, dashboard, empty-state, folder drag/drop, and transition polish.
- **5.21.8:** Lite Mode relocation, tactile interaction effects, toast layout and slogan formatting polish.
- **5.21.x:** vanity UX, duplicate detector, branding, backup, and security hardening improvements.
- **5.20.x and earlier:** foundational Vite/Capacitor Android setup, vault workflows, QR flows, and wallet management features.
