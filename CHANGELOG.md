# Changelog

All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.

## [5.21.9] - Current Release

### Release Focus

v5.21.9 completes the UI/UX polish pass for the wallet vault experience and updates Android release metadata for a tagged GitHub build.

### Added

- Localized Privacy Mode button labels across all supported locales.
- Dashboard entrance animations, chart animations, progress transitions, and privacy-aware total value rendering.
- Premium empty vault and empty folder states with clearer add/import CTAs.
- Modal/page transition utilities with Lite Mode and `prefers-reduced-motion` support.
- Desktop wallet-to-folder drag/drop with folder drop highlighting.
- Mobile wallet-card swipe actions for pin/unpin and delete.

### Improved

- Wallet cards now provide balance typography polish, hold-to-reveal secret viewing, and a compact overflow menu for secondary actions.
- Folder tabs visually respond to drag-over targets.
- `.gitignore` explicitly keeps the local `1/` instruction/scratch folder out of Git.

### Release Metadata

- `package.json`: `5.21.9`
- `package-lock.json`: `5.21.9`
- Android `versionName`: `5.21.9`
- Android `versionCode`: `94`

## Previous Releases - Compact Summary

- **5.21.8:** Lite Mode relocation, tactile interaction effects, toast layout and slogan formatting polish.
- **5.21.7:** localized theme names and safer locale update automation.
- **5.21.6:** Android app-only DPI override and persisted DPI preference.
- **5.21.x:** vanity UX, duplicate detector, branding, backup, and security hardening improvements.
- **5.20.x and earlier:** foundational Vite/Capacitor Android setup, vault workflows, QR flows, and wallet management features.
