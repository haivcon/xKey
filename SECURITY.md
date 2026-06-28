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

## Current Release Security Notes: v5.22.2

v5.22.2 is a UI layout, release metadata, and documentation update. It does not replace the existing encryption, backup, authentication, or local-only data model.

Security-relevant notes:

- Privacy Mode remains explicit and now has a smaller toggle inside the Total Assets card.
- Moving Key Health into Tools changes navigation only; health checks and proof-of-keys behavior are unchanged.
- Combining sorting into the filter panel is UI-only and does not alter wallet data.
- Header slogan resizing is display-only and does not affect security controls.
- Android metadata is updated to `versionCode 96` and `versionName 5.22.2`.

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
