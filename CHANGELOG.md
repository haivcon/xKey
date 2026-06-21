# Changelog

All notable changes to this project will be documented in this file.

## [5.10.4]

### Release Focus
v5.10.4 expands xKey's local vault hardening with self-healing backup/vault storage, tamper-evident backup previews, encrypted immutable audit logs, Android `.xkey` file-open handling, and an optional Root/Data Tamper Guard. The release focuses on detecting risky device states and corrupted or modified backup files before sensitive vault data is opened or imported.

### Backup Integrity and Self-Healing
- **Reed-Solomon vault recovery**: encrypted vault data now uses 10 data shards plus 5 parity shards, allowing recovery from multiple damaged shards before decrypting.
- **Self-healing backup payloads**: portable `.xkey` backups include parity metadata so xKey can repair recoverable corruption and report recovered bytes or shards.
- **Container-based `.xkey` format**: backups now use the `xkey-backup-v4` container with a readable header, encrypted payload, and recovery footer. The footer lets xKey still preview metadata when the main header is damaged.
- **Tamper-evident backup verification**: imports inspect backup metadata, payload hashes, container hashes, password seals, and recovery status before accepting the file.
- **Verify-only flow**: users can inspect a backup's created time, source device, wallet count, folder count, network count, backup ID, file hash, integrity state, and recovered shard count without importing it.
- **Verification report copy**: the backup preview can copy a concise verification report for offline review or support.

### Audit Log and External File Handling
- **Immutable local audit log**: xKey records security-sensitive events in an encrypted hash-chain log, including app open, unlock, backup import/export, verify-only checks, self-healing events, and tamper detections.
- **Protected audit viewer**: `Settings > Audit Log` requires device authentication before showing local security history.
- **Android `.xkey` open intent**: tapping a `.xkey` file from another app can open xKey directly and show the backup preview.
- **External-source warning**: backups opened from another Android app are clearly marked as external before import.
- **Pending external backup indicator**: after unlock, xKey shows when one external backup file is waiting for review.
- **ADB intent test script**: `npm run test:adb-open` can verify Android file-open behavior on a connected device.

### Device and Runtime Guard
- **Root/Data Tamper Guard**: a new Security setting can block vault access when Android root traces, `su`, test-keys, a debuggable app build, or enabled ADB are detected.
- **Startup enforcement**: when the guard is enabled and the device looks risky, xKey stops before opening the vault and writes `device_integrity.blocked` to the audit log.
- **Non-blocking default**: the guard is off by default so existing users are not unexpectedly locked out.
- **Clear limitation notice**: the UI explains that Android apps cannot fully prevent root users, device owners, or system settings from deleting app data; the guard detects risky runtime conditions and blocks vault access when enabled.
- **Native timeout hardening**: root command detection uses a short timeout so unusual ROM behavior cannot freeze startup.

### Localization and Settings UX
- Vietnamese and English strings were added for the new Root/Data Tamper Guard, device-risk reasons, external backup warnings, verify-only backup actions, recovery footer notices, and copied verification reports.
- Security settings now include a dedicated Root/Data Tamper Guard toggle with expandable details and current risk status.
- Backup preview now displays `backupId` and `containerHash` to help users distinguish real backups from lookalike files.

## Previous Releases

### [5.10.3 and earlier]
- v5.10.3 added signed runtime integrity checks, offline crypto KATs, manifest source binding to `github.com/haivcon/xKey`, and release workflow support for integrity signing keys.
- v5.10.2 improved security settings UX, hardware-bound backup guidance, light-theme warning contrast, Data-tab Danger Zone placement, folder action menus, and locale coverage.
- v5.10.1 introduced hardware-bound vault mode, Android screen-capture controls, secure glyph display, scrambled keyboard options, fragmented encrypted vault storage, and expanded Security settings explanations.
- v5.9.x and earlier added Settings navigation, backup UX, Shamir backup/restore, Android/Capacitor support, folders, tags, vanity tools, QR workflows, CSV import/export, manual balances, decoy vault, kill switch, and native clipboard/haptics.
