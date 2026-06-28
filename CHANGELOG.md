# Changelog

All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.

## [6.0.2] - Current Release

### Release Notes

- Adds hardened GitHub release workflows, clearer Android release download guidance, and a reusable release automation script.
- Synchronizes Android `versionName` with `package.json` to prevent APK metadata from lagging behind the GitHub release tag.

### Release Metadata

- `package.json`: `6.0.2`
- `package-lock.json`: `6.0.2`
- Android `versionName`: `6.0.2`
- Android `versionCode`: `100`


## [6.0.1] - Previous Release

### Release Focus

This update fixes the Android-specific App-only Minimum Width (smallestScreenWidthDp override) to apply correctly on API 30+, fixes early clamping logic that caused inaccurate "Effective scale" calculations, and corrects UI styling issues (double-scaling and mojibake characters) in the settings menu.

### Release Metadata

- `package.json`: `6.0.1`
- `package-lock.json`: `6.0.1`
- Android `versionName`: `6.0.1`
- Android `versionCode`: `99`

## [6.0.0] - Previous Release

### Release Focus

This is an important update as it updates the keystore for the APK in preparation for the Google Play release. It also adds the XKEY_INTEGRITY_KEY_PEM to ensure source code integrity and verify it has not been tampered with. Builds APK with version v6.0.0.

### Release Metadata

- `package.json`: `6.0.0`
- `package-lock.json`: `6.0.0`
- Android `versionName`: `6.0.0`
- Android `versionCode`: `98`

## Previous Releases - Compact Summary

- **5.22.2:** App-only Minimum Width settings for Android and UI language updates.

- **5.22.1:** mobile layout balance, total assets privacy toggle, and header reorganization.
- **5.22.0:** version metadata update before the mobile layout polish release.
- **5.21.9:** privacy mode, wallet card, dashboard, empty-state, folder drag/drop, and transition polish.
- **5.21.8:** Lite Mode relocation, tactile interaction effects, toast layout and slogan formatting polish.
- **5.21.x:** vanity UX, duplicate detector, branding, backup, and security hardening improvements.
- **5.20.x and earlier:** foundational Vite/Capacitor Android setup, vault workflows, QR flows, and wallet management features.
