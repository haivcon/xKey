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

## Current Release Security Notes: v6.0.14

v6.0.14 is a synchronized web and Android release. It updates release documentation, package metadata, and Android build metadata without changing the local-only custody model by default.

Security-relevant notes:

- Updated android/app/build.gradle (+2/-2): bumped Android versionName/versionCode so the APK/AAB can be published as a new build.
- Updated package-lock.json (+2/-2): kept the locked dependency metadata aligned with package.json.
- Updated package.json (+1/-1): synchronized the app version and npm package metadata for this release.
- Updated src/components/ExportCSVModal.tsx (+25/-4): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/backup/BackupImportPasswordModal.tsx (+36/-17): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/AdvancedSecuritySection.tsx (+92/-71): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/PinBiometricSection.tsx (+188/-58): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityAutomationSection.tsx (+45/-36): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityStatusSection.tsx (+75/-64): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/components/settings/security/SecurityTabContent.tsx (+345/-465): updated a reusable UI component or settings/dashboard screen behavior.
- Updated src/features/security/sensitiveActions.ts (+1/-11): updated feature-specific application logic.
- Updated src/features/security/sensitivePin.ts (+14/-23): updated feature-specific application logic.
- Updated src/hooks/useWalletGeneration.ts (+15/-2): updated shared React hook behavior used by the app.
- Updated src/index.css (+229/-1): updated the main app shell, styling, routing, or startup behavior.
- Updated src/locales/ar.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/de.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/en.ts (+102/-2): refreshed translation/localization content shown in the app UI.
- Updated src/locales/es.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/fr.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/hi.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/id.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ja.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ko.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/pt.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/ru.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/th.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/tr.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/locales/vi.ts (+102/-2): refreshed translation/localization content shown in the app UI.
- Updated src/locales/zh.ts (+98/-0): refreshed translation/localization content shown in the app UI.
- Updated src/main.tsx (+4/-1): updated the main app shell, styling, routing, or startup behavior.
- Updated src/utils/clipboard.ts (+13/-2): updated shared utility logic used across the app.
- Android metadata is updated to `versionCode 112` and `versionName 6.0.14`.
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
