# xKey Security Policy

xKey is an offline-first wallet vault for storing wallet addresses, private keys, seed phrases, notes, folders, tags, QR workflows, backups, and manual asset balances. The project is designed as a local encrypted vault, not as a network-connected trading wallet.

This document explains the current security model, supported platforms, expected user responsibilities, known limitations, and the long-term hardening direction for the project.

---

## 📋 Executive Summary (TL;DR)

> [!TIP]
> **For standard users:**
> - **We don't store your keys.** Everything is stored locally on your device, AES-encrypted.
> - **We don't have servers.** There is no cloud backup unless you manually export and save a `.xkey` file.
> - **Keep backups safe.** If you lose your device and have no backup, your vault cannot be recovered.
> - **Beware of malware.** xKey protects against casual snooping but cannot protect you if your OS itself is compromised (e.g., malware with screen recording or root access).

> [!WARNING]
> **Never share private keys, seed phrases, `.xkey` backup files, backup passwords, or Shamir shares with anyone.** 

---

## 🛡️ Security Goals

xKey aims to provide:
- Local-only wallet storage with **no server-side custody** and **no account system**.
- No remote key recovery or background upload of private keys/vault data.
- Encrypted local storage for wallet records.
- Android device-level unlock using the system lock screen where available.
- Portable encrypted backup files controlled by a user-chosen password.
- Clear fallback behavior when device security changes.

xKey is a **private cold-vault style manager**. It helps users store and organize sensitive wallet data locally. It does not replace careful backup practices, hardware wallets, or secure device hygiene.

---

## 🎯 Threat Model

| Included in Protection Scope (In Scope) | Excluded from Protection Scope (Out of Scope) |
| :--- | :--- |
| **Casual physical access:** Someone else picking up your unlocked phone. | **Device Compromise:** A rooted or thoroughly compromised device. |
| **App data inspection:** Attempting to read files without the vault key. | **Advanced Malware:** Screen recording, accessibility abuse, keyboard/clipboard monitoring malware. |
| **Clipboard exposure:** Mitigated via configurable clipboard auto-clear. | **Malicious OS:** A tampered OS, custom malicious ROM, or malicious keyboard. |
| **Idle access:** Mitigated via automatic vault lock after inactivity. | **User Error:** A user voluntarily sharing screenshots, QRs, or weak backup passwords. |
| **Biometric failure:** Safe fallback to Android device credentials. | **Total Data Loss:** Device wipe without any external `.xkey` backups. |

Users should treat every private key, seed phrase, and sensitive QR code shown by xKey as absolute secret material.

---

## 📱 Platform Model

### Android
Android is the preferred secure platform for xKey because it uses native device security.
- Uses the Android lock screen (Device Credential integration).
- If the device has a PIN/password/biometric configured, Android authenticates the user.
- The vault encryption key is protected with **Android Keystore** (AES/GCM/NoPadding) and requires recent user authentication.
- Google Play and GitHub builds use the unified package `com.haivcon.xkey`. *(Recommendation: use Google Play App Signing for seamless updates from both sources).*

### Web
The web version cannot access the same hardware-backed Keystore model.
- Authentication fallback is handled inside the web app.
- Security depends heavily on browser storage integrity.
- **Avoid using the web version on shared, untrusted, or infected devices.**

---

## 🔑 Vault Key Model

A random vault encryption key is generated to encrypt wallet data.
- On Android, this key is wrapped by the Android Keystore and unwrapped only after successful system authentication.
- If Android device security changes (e.g., removing screen lock), Keystore keys may become permanently unavailable.
- xKey keeps compatibility fallback data to reduce lockout risk, but if recovery is impossible, **the user must restore from a backup or reset the vault.**

> [!CAUTION]
> xKey cannot recover encrypted vault data without the required vault key or a valid backup. This is an intentional security property.

---

## 🔐 Encryption Model

- **Storage:** Wallet records are encrypted before being stored in Capacitor Preferences.
- **Field-level encryption:** Sensitive fields (private keys, seed phrases) are additionally encrypted using a derived field key from the primary vault key.
- **Backups:** Portable `.xkey` backups are encrypted with a user-provided password.

*Long-term target envelope format for safer migrations:*
```json
{
  "format": "xkey-vault",
  "version": 3,
  "createdAt": "2026-06-17T00:00:00.000Z",
  "kdf": { "name": "Argon2id or PBKDF2", "salt": "base64", "iterations": 600000 },
  "cipher": { "name": "AES-256-GCM", "iv": "base64", "tag": "base64" },
  "payload": "base64"
}
```

---

## 💾 Backup Security

> [!IMPORTANT]
> **Backup Rules:**
> 1. Use a strong backup password.
> 2. Store backups in multiple safe physical/offline locations.
> 3. Do not store the password beside the backup file.
> 4. Delete unsafe copies from chat apps, shared folders, or public cloud drives.

### Offline Shamir's Secret Sharing (2-of-3) Backup
- Ensure the 3 QR parts are stored in physically separate, secure locations.
- **Never** store 2 parts in the same location (defeats the 2-of-3 threshold).
- **Never** take photos of the QR sheets and upload them to cloud services (Google Photos, iCloud).

---

## 📋 Clipboard & Session Security

### Clipboard Auto-Clear
xKey writes copied sensitive values to the clipboard and schedules an auto-clear timeout. It only clears the clipboard if it still contains the exact value copied by xKey.
*Limitation:* Malware or other apps might read the clipboard before the timeout occurs. Avoid copying seeds/private keys unless absolutely necessary.

### Auto-Lock
Auto-lock triggers after configured inactivity. Security-sensitive screens require re-authentication before showing secrets.

---

## 📷 QR Code Security
- **Address QRs** are generally safe to share (always verify network/address).
- **Private Key / Seed QRs** are highly sensitive. Only show in private environments.
- Beware of screenshots, screen sharing, and physical camera surveillance.

---

## 🏗️ Android Release Hardening

Unified package: `com.haivcon.xkey`
Release Checklist:
- Verify package ID, label, and versions.
- Confirm signing key source & ensure no debug/development files are packaged.
- Keep `android:debuggable=false` for release builds.
- Avoid logging private keys, seeds, or decrypted payloads.

---

## 🕵️ Security Audits

> [!NOTE]
> **Audit Status:** This software is provided as-is and has not yet undergone an independent, third-party security audit. Use at your own risk. 
> 
> We employ best-effort security practices, but highly recommend doing your own research and managing your risks appropriately.

---

## 🚨 Reporting a Vulnerability

We take security issues seriously. Please report security issues privately before opening a public issue.

- **Email:** `security@xlayer.my` *(Preferred)*
- **GitHub:** [haivcon/xKey](https://github.com/haivcon/xKey)
- **X/Telegram:** [@haivcon](https://t.me/haivcon)

**SLA & Expectations:**
- We aim to acknowledge vulnerability reports within **48 hours**.
- At this time, we do not have an official Bug Bounty program, but we will publicly credit researchers who responsibly disclose vulnerabilities.

**When reporting, please include:**
- Affected platform (Android APK, Google Play build, or Web).
- xKey / OS version.
- Detailed reproduction steps.
- Whether private keys, backups, or vault keys may be exposed.

> [!WARNING]
> Please do **not** include real private keys, seed phrases, or backup passwords in your report unless they are test-only dummy data.

---

## 🧑‍💻 Secure Development Rules (For Contributors)

- Never commit private keys, real user wallets, signing keys, or API secrets.
- Never log decrypted wallet data or vault keys.
- Do not weaken encryption for convenience.
- Keep destructive actions behind explicit confirmation.
- Prefer platform security APIs over custom authentication.
