# Changelog

All notable changes to this project are documented here.

## [5.18.1] - Current Release

### Release Focus

v5.18.1 refreshes the Android release metadata, documentation, and publish notes for the current advanced vanity-wallet generation upgrade. The release emphasizes safer long-running scans, improved visibility for generated addresses, explicit secure reveal/copy actions, better folder routing, and multilingual guidance.

### Upgraded Features

- **Advanced vanity match discovery:** The vanity worker now keeps additional high-value matches based on mathematical address patterns, including forward sequences, reverse sequences, dual-end repetitions, symmetry, palindromes, alternating patterns, and bracket-style endings.
- **Expanded result visibility:** Vanity scan results now use larger scrollable lists and middle truncation so both the beginning and ending of each address remain visible.
- **Secure details workflow:** Private keys and seed phrases in generated results stay hidden until the user explicitly reveals them, reducing accidental exposure during scans.
- **Save and folder routing:** Users can save individual vanity results or bulk-save selected results directly into a target vault folder.
- **Custom secondary reserve:** The generator can retain a user-selected number of extra beautiful secondary wallets with limits that protect memory usage.
- **CPU and heat guidance:** User-facing guidance explains why long vanity scans heat CPUs, how heat can affect battery/device health, and how to reduce risk with cooling breaks, lower workload, and better ventilation.
- **Theme and responsive layout improvements:** Generator metrics, status indicators, address rows, and action areas were refined for light/dark readability and mobile layout stability.
- **Localization sync:** Vanity generator labels, heat warnings, advanced pattern descriptions, pause/resume actions, and save controls were synchronized across supported locales.
- **Android release metadata:** Updated Android app metadata to `versionCode 81` and `versionName 5.18.1`.
- **Documentation refresh:** Updated README, Security Policy, Contributing Guide, Code of Conduct, Architecture Overview, Changelog, and ignore rules with current release information.

### Verification

- `npm run lint`
- `npm run type-check`
- `npm run test:vanity`
- `npm run build`
- `npx cap sync android`

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

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