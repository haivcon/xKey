# xKey Security Policy

xKey is an offline-first wallet vault for storing wallet records, private keys, seed phrases, notes, folders, tags, QR workflows, encrypted backups, Shamir recovery material, local audit history, and manual asset balances.

xKey is a local cold-vault style manager. It is not a network-connected trading wallet, exchange account, cloud wallet, or custodial recovery service.

---

## Executive Summary

- Vault data remains local to the user's device unless the user manually exports it.
- xKey does not run a custody server and does not provide cloud recovery.
- Private keys, seed phrases, `.xkey` backups, backup passwords, Shamir shares, and QR recovery material must be protected by the user.
- Android builds use native platform security where available, including Device Credential and Android Keystore integration.
- The web fallback cannot provide the same hardware-backed guarantees as Android.
- xKey cannot recover encrypted vault data without the correct vault key, backup password, or recovery material.

> [!WARNING]
> Never share private keys, seed phrases, `.xkey` backup files, backup passwords, QR recovery shares, or screenshots containing secret material.

---

## Current Release Security Notes: v6.0.8

v6.0.8 is a synchronized web and Android release. It updates release documentation, package metadata, and Android build metadata without changing the local-only custody model by default.

Security-relevant notes:

- Summary of implemented changes:
- 1. Secret placement warning
- - Added detection for private keys and mnemonic-like recovery phrases in non-secret fields.
- - If a user pastes sensitive material into wallet notes or wallet name, xKey now warns that the content should be moved to a protected secret field.
- - Added guidance/actions to move detected content into the appropriate protected field instead of leaving it in regular notes.
- 2. Data sensitivity classification
- - Added a new sensitivity model in `src/utils/dataSensitivity.ts`.
- - Introduced sensitivity levels:
- - `public`
- - `private`
- - `critical_secret`
- - `recovery_material`
- - Introduced secret/data kinds:
- - `address`
- - `privateKey`
- - `mnemonic`
- - `backupHint`
- - `sensitiveNote`
- - `generic`
- - These labels allow xKey to apply different security behavior depending on the data type.
- 3. Clipboard policy by secret type
- - Added per-kind clipboard policies.
- - Addresses are treated as public and can remain on the clipboard longer.
- - Private keys, mnemonic phrases, and sensitive notes are treated as high-risk secrets with shorter default clipboard lifetime.
- - Backup hints and generic private data use separate warning/timeout policies.
- 4. Multi-layer clipboard clearing
- - Enhanced `secureCopy` in `src/utils/clipboard.ts`.
- - After copying sensitive content, xKey schedules automatic clipboard clearing.
- - Clipboard clearing now overwrites the clipboard in multiple steps:
- - random noise string,
- - empty string,
- - blank space.
- - This gives better protection than a single clear operation.
- 5. Disable secret copy mode
- - Added a high-security setting key: `xkey_disable_secret_copy`.
- - When enabled, copying private keys, mnemonic phrases, and sensitive notes is blocked.
- - Users can still use reveal-style access, but direct copy for secrets is prevented.
- 6. Sensitive notes
- - Added `sensitiveNotes` support to the wallet data model.
- - Sensitive notes are handled separately from normal notes.
- - They follow secret-style behavior, including reveal/copy protection and secret clipboard policy.
- - This allows users to store confidential notes without exposing them like ordinary wallet notes.
- 7. Wallet UI integration
- - Updated `WalletCard` behavior to support sensitive notes and protected copy/reveal flows.
- - Added warning and migration UI for sensitive content found in regular notes.
- - Added protected handling for copying private keys, mnemonic phrases, addresses, and sensitive notes using the new clipboard policy system.
- 8. Settings UI integration
- - Added security setting support for disabling secret copy.
- - Integrated the new clipboard/security behavior into the existing security settings structure.
- 9. Localization
- - Added English locale strings for the new security warnings, labels, and actions in `src/locales/en.ts`.
- 10. Tests
- - Added `tests/secret-detection.test.mjs`.
- - The test verifies:
- - private key detection,
- - mnemonic-like phrase detection,
- - normal notes are not falsely detected,
- - placement warning text is generated,
- - clipboard policy sensitivity levels are correct,
- - secret-kind classification works.
- - Added `test:secret-detection` to `package.json`.
- - Included the new test in the main `npm test` chain.
- Android metadata is updated to `versionCode 106` and `versionName 6.0.8`.
- The offline-first vault model, encryption boundaries, backup ownership, and secret-handling requirements remain unchanged unless explicitly stated above.
---

## Supported Security Scope

| In Scope | Out of Scope |
| :--- | :--- |
| Casual access to an unlocked or unattended device. | Fully compromised devices, rooted OS builds, malicious ROMs, or malware-controlled environments. |
| Encrypted local vault storage. | Recovery after the user loses all devices and all backups. |
| Clipboard exposure reduction and explicit reveal/copy controls. | Malware that records the screen, keyboard, accessibility events, or clipboard contents. |
| Idle locking, privacy masking, and protected display flows. | A user voluntarily sharing secret material or screenshots. |
| Tamper-aware backups and local audit history. | Guaranteeing funds if keys are imported into unsafe wallets or reused elsewhere. |

---

## Platform Model

### Android

Android is the preferred platform for secure vault usage.

- Android Device Credential can be used for unlock flows.
- Android Keystore protects key material where supported by the device.
- The package name is `com.haivcon.xkey`.
- Removing or changing device security can make hardware-protected keys unavailable. Always keep encrypted backups.

### Web

The web version is useful for portability and inspection but has weaker security boundaries. Browser storage is not equivalent to Android Keystore, and compromised browsers or operating systems can undermine local security.

---

## Vault, Backup, and Recovery Model

- Vault records are encrypted before persistence.
- `.xkey` backup files are portable encrypted containers controlled by the user.
- Backup passwords must be strong, unique, and stored separately.
- Shamir recovery shares should be stored in separate physical locations.
- xKey cannot reset, recover, or bypass encryption for lost vaults.

---

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities. Report privately by email:

```text
security@xlayer.my
```

Include the affected version/commit, platform, clear reproduction steps, impact assessment, and logs/screenshots with all secrets removed or blurred.

---

## Secure Release Requirements

Before publishing a release, maintainers should run:

```bash
npm run type-check
npm run build
npx cap sync android
```

Use `v*` git tags so GitHub Actions can build Android artifacts from a clean tag.
