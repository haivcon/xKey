# xKey Security Policy

xKey is an offline-first wallet vault for storing wallet addresses, private keys, seed phrases, notes, folders, tags, QR workflows, encrypted backups, Shamir recovery material, local audit history, and manual asset balances.

xKey is a local cold-vault style manager. It is not a network-connected trading wallet, exchange account, cloud wallet, or custodial recovery service.

---

## Executive Summary

- xKey stores vault data locally on the user's device.
- xKey does not run a custody server and does not provide cloud recovery.
- Sensitive exports such as `.xkey` backups, private keys, seed phrases, and Shamir shares must be protected by the user.
- Android builds use native platform security where available, including Device Credential and Android Keystore integration.
- The web fallback cannot provide the same hardware-backed guarantees as Android.
- xKey cannot recover encrypted vault data without the correct vault key, backup password, or recovery material.

> [!WARNING]
> Never share private keys, seed phrases, `.xkey` backup files, backup passwords, QR recovery shares, or screenshots containing secret material.

---

## Supported Security Scope

| In Scope | Out of Scope |
| :--- | :--- |
| Casual access to an unlocked or unattended device. | A fully compromised device, rooted OS, malicious ROM, or malware-controlled environment. |
| Encrypted local vault storage. | Recovery after the user loses all devices and all backups. |
| Clipboard exposure reduction through auto-clear flows. | Malware that records the screen, keyboard, accessibility events, or clipboard contents. |
| Idle locking and explicit reveal/copy controls. | A user voluntarily sharing secret material or screenshots. |
| Tamper-aware backups and local audit history. | Guaranteeing funds if keys are imported into unsafe wallets or reused elsewhere. |

Users should treat every private key, seed phrase, QR code, and exported backup as high-value secret material.

---

## Current Release Security Notes: v5.21.4

v5.21.4 focuses on critical security tab fixes, addressing UI logic bugs that previously locked out features or behaved unexpectedly during configuration.

Security-relevant changes include:

- Biometric UI fix: Security settings (PIN, Kill Switch, Decoy Vault, Shake-to-lock) are no longer hidden on devices with biometrics.
- Device Integrity and Screen Capture: Added proper busy-state guards and unsupported-environment checks.
- Android metadata is updated to `versionCode 89` and `versionName 5.21.4`.

---

## Platform Model

### Android

Android is the preferred platform for secure vault usage.

- Android Device Credential can be used for unlock flows.
- Android Keystore protects key material where supported by the device.
- The package name is `com.haivcon.xkey`.
- Removing or changing device security can make hardware-protected keys unavailable. Always keep encrypted backups.

### Web

The web version is useful for portability and inspection but has weaker security boundaries.

- Browser storage is not equivalent to Android Keystore.
- Shared, infected, or managed browsers should not be used for real funds.
- Browser extensions, malware, and compromised operating systems can undermine local security.

---

## Vault and Backup Model

- Vault records are stored locally and encrypted before persistence.
- Sensitive fields such as private keys and seed phrases are treated as secret data.
- `.xkey` backup files are portable encrypted containers controlled by the user.
- Backup passwords must be strong, unique, and stored separately.
- Shamir recovery shares should be stored in separate physical locations.
- xKey cannot reset, recover, or bypass encryption for lost vaults.

---

## Vanity Wallet Generation Safety

Vanity generation is CPU intensive because it repeatedly creates candidate wallets until matching addresses are found.

Users should:

- Run scans only on trusted devices.
- Keep the device cool and ventilated.
- Avoid long scans while charging on hot surfaces.
- Pause scans if the device becomes hot or sluggish.
- Use lower reserve limits on low-memory devices.
- Copy or save generated secrets only when the surrounding environment is private.
- Back up generated wallets immediately if they will be used for real assets.

The vanity generator improves address discovery convenience. It does not make generated keys safer than other cryptographically random wallet keys.

---

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities.

Report privately by email:

```text
security@xlayer.my
```

Please include:

- Affected version or commit hash.
- Platform: Android, web, or both.
- Clear reproduction steps.
- Expected and actual behavior.
- Impact assessment.
- Logs or screenshots with all secrets removed or blurred.

We will prioritize reports involving secret exposure, backup compromise, authentication bypass, encryption misuse, or unsafe release artifacts.

---

## Secure Development Requirements

Before publishing a release, maintainers should run:

```bash
npm run lint
npm run type-check
npm run test:vanity
npm run build
npx cap sync android
```

Release tags should use the `v*` format so the GitHub Actions Android build pipeline can run from a clean tag.