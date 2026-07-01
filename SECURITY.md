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

## Current Release Security Notes: v6.0.19

v6.0.19 is a synchronized web and Android release. It updates release documentation, package metadata, and Android build metadata without changing the local-only custody model by default.

Security-relevant notes:

- - 🚀 Improved app startup stability by fixing hydration mismatch and deferring rendering until client mount.
- - 📱 Added Android app-only display scaling with native WebView support, safe clamping, and localized controls.
- - 🛡️ Strengthened device integrity, secondary PIN protection, brute-force backoff, and sensitive-action verification.
- - 🔐 Added a high-security session preset with clearer grouped security settings and safer verification UX.
- - 🧠 Added 2D HD Wallet Explorer for 24-word BIP-39 seeds with branch visualization and duplicate protection.
- - 🔎 Enhanced Vanity tools with pattern analysis, ETA, live progress, worker tuning, time limits, and quantity mode.
- - 📦 Added extra vanity wallet auto-keep with scoring, filters, previews, save-all controls, and backup confirmation.
- - 🌡️ Added CPU thermal monitoring with warning, pause, critical thresholds, and heat-safety guidance.
- - 💾 Added encrypted vanity session restore after app restart with pending-session alerts and safe cleanup.
- - 📊 Added local vanity session reports after each run, including time, speed, pattern, candidates, and result.
- - 🧹 Added clear-history support for saved vanity reports.
- - 🌐 Synchronized translations and locale keys across all supported languages.
- Android metadata is updated to `versionCode 117` and `versionName 6.0.19`.
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
