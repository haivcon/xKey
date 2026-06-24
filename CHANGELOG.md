# Changelog

All notable changes to this project will be documented in this file.

## [5.17.0]

### Release Focus
v5.17.0 focuses on **Advanced Vanity Wallet Generation**, significantly improving the vanity wallet generator's pattern matching capabilities, UI/UX, and saving options.

### Vanity Generation Enhancements
- **Advanced Pattern Matching:** Upgraded the vanity worker (`vanityWorker.ts`) and matching logic (`vanityMatch.ts`) to detect high-value multi-patterns.
- **New Patterns Supported:** Added support for full symmetry, forward/backward sequences, dual-end repetitions, and complex nested patterns.
- **Customizable Saving:** Users can now specify a custom quantity of extra vanity wallets to retain during a generation run.
- **Performance:** Optimized worker message passing and array allocations during high-speed scans.

### UI and Accessibility Improvements
- **Theme Readability:** Fixed light/dark theme contrast issues within the Create Wallet Modal, ensuring text is legible in both modes.
- **Address Display:** Optimized wallet address truncation for ultra-wide screens, keeping both the start and end of the address visible.
- **Secure View/Copy:** Added secure toggles to view and copy private keys and seed phrases within the generation results.
- **Localization:** Fixed missing translation keys for the generator's pause/resume states across all supported languages.

### Verification
- `npm run lint`
- `npm run type-check`
- `npm run test:vanity`
- `npm run build`
- `npx cap sync android`

<details>
<summary>Click to expand previous release history</summary>

## [5.12.2]

### Release Focus
v5.12.2 hardens xKey startup behavior, backup restore ergonomics, long-running vanity-wallet generation, and Android Back handling.

### Startup and Runtime Integrity
- Fixed a React Strict Mode startup race that could leave the animated splash screen visible indefinitely after the initial integrity effect was replayed.
- Added a total integrity-check deadline and per-request deadlines so a failed asset read reaches a safe error state instead of blocking startup.
- Abort outstanding manifest and asset requests after the total integrity timeout.
- Verify signed app assets with a bounded concurrency of two requests to reduce CPU and memory pressure on lower-end devices.

### Vanity Wallet Generation
- Rebuilt the active vanity-generator view as a focused workspace with progress, cumulative scan metrics, selected match list, bounded live terminal, copy controls, and pause/resume/stop actions.
- Preserve scanned count and elapsed time across pause/resume so estimated progress and configured time limits remain accurate.
- Keep generated match data available after stopping, allow users to adjust selections, and prevent the same result from being saved twice.
- Route Android Back and the close control through the safe generator shutdown path so selected matches are saved before the modal closes.
- Persist only non-sensitive vanity preferences: target count, time limit, network, and folder. Invalid stored time limits and deleted folders are safely normalized.

### Backup and Header UX
- Moved the slogan into the home header and placed the compact version label next to the xKey wordmark.
- Made the restore dialog use available mobile width, scroll within the viewport, ignore backdrop taps, and wrap translated actions without horizontal overflow.

### Verification
- `npm run lint`
- `npm run type-check`
- `npm run test:smoke -- --grep "runtime integrity"`
- `npm run build`
- `npx cap sync android`

## [5.12.1]

### Release Focus
v5.12.1 focuses on xKey's product identity, slogan placement, Android UI polish, Shamir QR printed backup branding, and full localization for the new brand reminders.

### Brand Identity and Slogan
- Added the slogan **NOT YOUR KEY, NOT YOUR CRYPTO** as a consistent xKey security message across product surfaces.
- Added a reusable BrandSlogan component and a centralized slogan constant to prevent inconsistent wording across the app.
- Added a subtle animated home-header slogan in the unused space between the version badge and folder bar without increasing the header height or reducing the visible wallet list.
- Added contextual slogan reminders to lock, backup, restore, CSV export, empty-vault, secret-copy, and backup-health surfaces.
- Added a Settings toggle for security slogan reminders so users can reduce repeated brand prompts while keeping Splash, About, README, and printed materials branded.

### UI and Backup Presentation
- Centered slogan blocks and explanatory text in backup and CSV flows for cleaner Android presentation.
- Increased the About screen slogan size and centered the xKey brand description.
- Added xKey watermarking to Shamir QR UI, print sheets, and saved HTML files, including slogan, backup ID, creation time, and backup safety context.
- Added Google Play listing copy to README using the new slogan.

### Localization
- Added full translations for all new brand reminder, slogan explanation, and warning text across `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, and `zh`.

### Verification
- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npx cap sync android`
- `android\gradlew.bat assembleDebug`

## [5.12.0]

### Release Focus
v5.12.0 focuses on backup safety, Android file-export reliability, Shamir QR usability, audit-log polish, full localization coverage, and post-TypeScript hardening.

### Brand Identity and Slogan
- Added the xKey slogan **NOT YOUR KEY, NOT YOUR CRYPTO** across splash, lock, backup, restore, CSV export, empty state, About, onboarding, Shamir QR print/export, README, and release materials.
- Added a reusable BrandSlogan UI component and centralized slogan constant to keep the phrase consistent across the app.
- Added a Settings toggle for contextual security slogan reminders so users can reduce repeated prompts while keeping the slogan in core brand surfaces.
- Added Shamir QR print/HTML watermarking with xKey branding, slogan, backup ID, creation time, and backup safety context.
- Added Google Play listing copy that uses the slogan without changing app behavior.

### Backup, Restore, and File Export
- **Native Android save flow**: `.xkey`, CSV, and Shamir QR HTML exports can be saved through Android's document picker with user-selected file names and destinations.
- **Verified saved backups**: portable `.xkey` exports can be verified after saving by checking the saved file URI, SHA-256 hash, metadata, backup ID, wallet count, and integrity state.
- **Detailed `.xkey` preview**: restore dialogs show source device, created time, wallet/folder/network counts, source, backup ID, and full file hash before import.
- **Copyable verification data**: backup ID, file hash, and the full verification report can be copied for offline comparison.
- **Verify-only restore flow**: users can inspect external `.xkey` files without importing them into the vault.
- **Safer restore choices**: backup preview supports Merge, Replace, and Verify only paths, with current-vault comparison data.
- **Container recovery hardening**: the current `.xkey` format keeps metadata, encrypted payload, recovery footer, and Reed-Solomon 10+5 shard recovery.

### Shamir QR Recovery
- **Tap-to-zoom QR codes**: Shamir QR pages can be enlarged for easier scanning.
- **Named Shamir exports**: Shamir QR sets can be saved as named `.html` files through the Android save flow.
- **Safer HTML output**: exported Shamir HTML escapes wallet names and warning text before writing the file.
- **Improved print/share flow**: current-part and all-part print/share actions remain available with clearer mobile controls.

### Audit, History, and UX
- **Audit Log redesign**: protected security audit entries are separated from local action history.
- **Compact action history**: action history now shows summary counters, category filters with counts, a shorter default list, and an expandable view.
- **Localized action history**: many toast/action history entries now store translation keys to reduce mixed-language history after language changes.
- **Language switching polish**: changing app language no longer triggers unnecessary device-lock authentication.
- **Keyboard ergonomics**: password and text fields scroll into view when the Android keyboard opens.
- **Light-theme contrast**: warning, backup, restore, and notice panels have improved readability in light mode.

### Security and Localization
- **External backup caution**: files opened from external apps are clearly marked before import.
- **Root/Data Tamper Guard polish**: device-risk and hardware-bound vault guidance is clearer across settings.
- **Secure display accessibility**: secure display and sortable controls now use localized accessibility labels.
- **Full locale coverage**: new strings are translated across `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, and `zh`.

### Verification
- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npx cap sync android`
- `android\gradlew.bat assembleDebug`

## [5.11.0]

### Release Focus
v5.11.0 completes the full TypeScript migration for xKey and enables strict static checking across the application. This release is focused on making the security-critical code paths easier to audit, safer to maintain, and less likely to regress during future vault, backup, and Android releases.

### TypeScript and Build Safety
- **Full source migration**: all application source files have been migrated from `.js`/`.jsx` to `.ts`/`.tsx`.
- **Strict mode enabled**: `tsconfig.json` now uses `strict: true` and `allowJs: false`.
- **Direct type-check script**: added `npm run type-check` for `tsc --noEmit`.
- **Typed Vite build config**: `vite.config.ts` is included in TypeScript checks, including the runtime-integrity manifest plugin.
- **Typed test execution**: Shamir and Reed-Solomon tests now run through `tsx` so they import TypeScript source directly.
- **New type coverage**: added type packages for `crypto-js` and `papaparse`.

### Security-Critical Typing Improvements
- **Backup parser hardening**: `.xkey` parsing, backup inspection, metadata preview, recovery footer handling, password seal checks, and tamper detection now have explicit TypeScript models.
- **Vault storage hardening**: fragmented vault manifests, Reed-Solomon shard recovery, legacy fallback reads, save queues, and storage health checks are typed.
- **Key retrieval safety**: biometric key retrieval, Android device credential fallback, and fallback AES key persistence now have explicit return types.
- **Wallet save/load safety**: encrypted wallet save/load flows now validate nullable key paths more clearly while preserving current unlock behavior.
- **Settings encryption safety**: encrypted settings helpers now return stable string values for Capacitor Preferences writes.

### Current Security and Backup Surface
- **Self-healing storage**: vault and portable backup recovery use Reed-Solomon 10 data shards plus 5 parity shards.
- **Tamper-evident backups**: `.xkey` backup previews show file metadata, integrity state, `backupId`, `containerHash`, recovered shards, and verify-only reports.
- **Container backup format**: `.xkey` files use a header, encrypted payload, and recovery footer so metadata can still be inspected when the header is damaged.
- **Audit log**: sensitive local actions are recorded in an encrypted hash-chain audit history with protected viewing.
- **Android file-open flow**: external `.xkey` files can open xKey directly and are clearly marked as coming from another app.
- **Root/Data Tamper Guard**: optional Android risk detection can block vault access when risky runtime conditions are detected.

### Verification
- `npm run type-check`
- `npm run lint`
- `npm run test:shamir`
- `npm run test:reed-solomon`
- `npm run test:smoke`
- `npm run build`
- `npx cap sync android`
- `android\gradlew.bat -p android assembleDebug`

## Previous Releases

- **v5.10.4**: added self-healing backup/vault storage, tamper-evident backup previews, encrypted immutable audit logs, Android `.xkey` open handling, verify-only backup reports, and Root/Data Tamper Guard.
- **v5.10.3**: added signed runtime integrity checks, offline crypto KATs, manifest source binding to `github.com/haivcon/xKey`, and release workflow support for integrity signing keys.
- **v5.10.2**: improved security settings UX, hardware-bound backup guidance, light-theme warning contrast, Data-tab Danger Zone placement, folder action menus, and locale coverage.
- **v5.10.1 and earlier**: added hardware-bound vault mode, Android screen-capture controls, secure glyph display, scrambled keyboard options, fragmented encrypted vault storage, Settings navigation, Shamir backup/restore, folders, tags, vanity tools, QR workflows, CSV import/export, manual balances, decoy vault, kill switch, and native clipboard/haptics.

</details>
