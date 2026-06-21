# Changelog

All notable changes to this project will be documented in this file.

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
