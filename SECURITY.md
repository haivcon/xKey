# xKey Security Policy

xKey is an offline-first wallet vault for storing wallet addresses, private keys, seed phrases, notes, folders, tags, QR workflows, backups, and manual asset balances. The project is designed as a local encrypted vault, not as a network-connected trading wallet.

This document explains the current security model, supported platforms, expected user responsibilities, known limitations, and the long-term hardening direction for the project.

## Security Goals

xKey aims to provide:

- Local-only wallet storage.
- No server-side custody.
- No account system.
- No remote key recovery.
- No background upload of private keys, seed phrases, or vault data.
- Encrypted local storage for wallet records.
- Android device-level unlock using the system lock screen where available.
- Portable encrypted backup files controlled by a user-chosen password.
- Clear fallback behavior when device security changes.

xKey is best understood as a private cold-vault style manager. It helps users store and organize sensitive wallet data locally. It does not replace careful backup practices, hardware wallets, or secure device hygiene.

## Threat Model

### In Scope

xKey is designed to reduce risk from:

- Casual device access by another person.
- App data inspection without the vault key.
- Accidental clipboard exposure through configurable clipboard auto-clear.
- Accidental access after inactivity through auto-lock.
- Loss of biometric availability by falling back to Android device credentials where supported.

### Out of Scope

xKey cannot fully protect against:

- A rooted or compromised device.
- Malware with screen recording, accessibility abuse, keyboard capture, or clipboard monitoring permissions.
- A malicious operating system, browser, WebView, keyboard, or Android ROM.
- A user sharing screenshots, QR codes, backups, private keys, or seed phrases.
- Weak backup passwords.
- Physical coercion.
- Supply-chain compromise outside the verified repository and build process.
- Loss of all backups after device storage or Android Keystore data becomes unavailable.

Users should treat every private key, seed phrase, and sensitive QR code shown by xKey as secret material.

## Platform Model

### Android

Android is the preferred secure platform for xKey because it can use native device security.

Current Android behavior:

- xKey uses the Android lock screen through the app's Device Credential integration.
- If the device has a PIN, password, pattern, fingerprint, or supported biometric unlock configured, Android can authenticate the user through the system UI.
- The vault encryption key is protected with Android Keystore when device credential support is available.
- The Android Keystore wrapping key uses AES/GCM/NoPadding.
- The wrapping key requires recent user authentication.
- On modern Android versions, authentication allows strong biometric or device credential fallback.
- Google Play and GitHub builds use the unified package `com.haivcon.xkey`.

To allow seamless updates from GitHub over a Google Play installation, the project recommends using Google Play App Signing with the same local upload keystore. This ensures the digital signature matches across all installation sources.

### Web

The web version cannot access the same Android system PIN, password, pattern, or hardware-backed Keystore model as the native Android app.

For web usage:

- Authentication fallback must be handled inside the web app.
- Security depends more heavily on browser storage integrity and the browser environment.
- Users should avoid using the web version on shared, untrusted, or infected devices.
- Browser extensions, compromised browsers, and unsafe clipboards can weaken protection.

## Vault Key Model

xKey uses a generated vault encryption key to encrypt wallet data. On Android, the project attempts to protect that key with device-level authentication.

Current key handling:

- A random vault key is generated when needed.
- On Android with device credential support, the vault key can be wrapped by Android Keystore.
- The wrapped key is only unwrapped after successful Android system authentication.
- xKey keeps compatibility fallback data to reduce lockout risk during migrations and credential transitions.
- If Android device security changes and the Keystore key becomes unavailable, xKey attempts recovery where possible.
- If recovery is impossible, the user must restore from a `.xkey` backup or reset the vault.

Important: xKey cannot recover encrypted vault data without the required vault key or a valid backup. This is an intentional security property.

## Biometric and Device Credential Fallback

xKey should use Android's system security instead of maintaining a separate in-app PIN on Android.

Recommended Android model:

- User opens xKey.
- Android asks for biometric unlock if available.
- If biometric fails, the biometric sensor is unavailable, the fingerprint changes, or the user cannot use biometric unlock, Android falls back to the device PIN, password, or pattern.
- xKey receives only success or failure. xKey should not know the user's Android PIN, password, or pattern.

This approach avoids the common failure mode where an in-app PIN and biometric state become inconsistent.

Expected behavior:

- Biometric success unlocks the vault.
- Device PIN/password/pattern success unlocks the vault.
- Biometric failure should not force users to create a new app PIN.
- Changing Android screen lock may require re-authentication or re-wrapping of the vault key.
- Removing Android screen lock can make protected vault keys unavailable.

If users change device security settings, they should open xKey once afterward and verify that the vault unlocks correctly.

## Encryption Model

Current implementation:

- Wallet records are encrypted before being stored in Capacitor Preferences.
- Sensitive wallet fields such as private keys and seed phrases are additionally encrypted at field level.
- Field-level encryption uses a derived field key from the primary vault key.
- Portable `.xkey` backups are encrypted with a user-provided password.
- Some legacy compatibility paths may accept older encrypted formats.

Current implementation details may evolve. The long-term target is a versioned encryption envelope that is explicit, migratable, and auditable.

Recommended long-term encryption envelope:

```json
{
  "format": "xkey-vault",
  "version": 3,
  "createdAt": "2026-06-17T00:00:00.000Z",
  "kdf": {
    "name": "Argon2id or PBKDF2",
    "salt": "base64",
    "iterations": 600000
  },
  "cipher": {
    "name": "AES-256-GCM",
    "iv": "base64",
    "tag": "base64"
  },
  "payload": "base64"
}
```

The goal of this structure is to make future migrations safer. A versioned format allows xKey to read older vaults, upgrade encryption parameters, and avoid silent ambiguity.

## Backup Security

xKey supports encrypted `.xkey` backups.

Backup rules:

- Use a strong backup password.
- Store backups in more than one safe location.
- Do not store the backup password beside the backup file.
- Test restore before relying on a backup.
- Treat backup files as sensitive even when encrypted.
- Delete unsafe copies from shared folders, chat apps, and public cloud locations.

**Offline Shamir's Secret Sharing (2-of-3) Backup:**
- For Shamir backups, ensure the 3 QR parts are stored in physically separate, secure locations (e.g., different safes or locations).
- Never store 2 parts in the same location, as that defeats the purpose of the 2-of-3 threshold.
- Do not take photos of the QR sheets and upload them to cloud services (Google Photos, iCloud), as this breaks the offline security model.

If the Android Keystore key is lost, invalidated, or the device is wiped, a valid backup may be the only recovery path.

## Clipboard Security

xKey supports secure copy with configurable clipboard auto-clear.

Current clipboard behavior:

- xKey writes copied sensitive values to the clipboard.
- xKey can schedule auto-clear after a configured timeout.
- xKey only clears the clipboard if it still contains the same value copied by xKey.
- This avoids deleting unrelated clipboard content that the user copied afterward.

Limitations:

- Some platforms deny clipboard writes outside a direct user gesture.
- Other apps, keyboards, accessibility services, or malware may read clipboard content before it is cleared.
- Clipboard auto-clear reduces exposure time; it does not make clipboard use risk-free.

Users should avoid copying seed phrases or private keys unless necessary.

## Auto-Lock and Session Security

xKey includes auto-lock after inactivity.

Recommended behavior:

- Auto-lock should trigger after the configured idle timeout.
- Active long-running local tasks, such as vanity wallet generation, should be treated carefully so users are not locked out during an expected operation.
- Unlock should always use the configured platform security model.
- Returning from Android security settings should re-check device credential availability instead of looping the user through a broken unlock state.

Security-sensitive screens should require re-authentication before showing private keys, seed phrases, sensitive QR codes, or export data.

## QR Code Security

xKey can show QR codes for addresses and sensitive data.

Rules:

- Address QR codes are generally safe to share publicly, but users should still verify the address and network.
- Private key and seed phrase QR codes are highly sensitive.
- Sensitive QR codes should only be shown in private.
- Screenshots, screen sharing, and camera surveillance can leak QR data.
- Downloaded or shared QR images should be treated as secret when they contain private data.

## Android Release Hardening

xKey uses a single, unified Android release channel:

- Google Play and GitHub APK: `com.haivcon.xkey`

This unification allows users to seamlessly update the app using GitHub APKs even if they originally installed it from Google Play, provided the exact same App Signing Key is used.

Recommended release checklist:

- Verify package ID before release.
- Verify app label before release.
- Verify version name and version code.
- Build GitHub APK and Google Play AAB separately.
- Confirm signing key source.
- Confirm no debug build is published.
- Confirm no development-only files are packaged.
- Confirm `docs/`, local notes, build folders, and private files are not uploaded accidentally.
- Run lint and production build.
- Run Android release build.
- Check generated artifacts with `aapt` or equivalent tooling.
- Create a signed Git tag for each release when possible.
- Publish release notes for all supported languages.

Recommended Android hardening items:

- Keep `android:debuggable=false` for release builds.
- Avoid exported activities unless required.
- Avoid logging private keys, seed phrases, vault keys, backup passwords, or decrypted wallet payloads.
- Consider blocking screenshots on sensitive screens.
- Keep dependency versions reviewed.
- Keep Capacitor plugins updated.
- Review backup and file-sharing behavior on new Android versions.

## Internationalization Security

Security text must be understandable in every supported language.

Translation requirements:

- Unlock errors must explain what happened without exposing sensitive details.
- Backup warnings must be direct and unambiguous.
- Clipboard warnings must explain that copied secrets may be visible to other apps.
- Device lock setup instructions must clearly explain that xKey uses Android system security.
- Destructive actions must use strong confirmation language.
- Fallback and recovery messages must tell users when a `.xkey` backup is required.

Recommended engineering control:

- Add an i18n key completeness check.
- Fail release builds when required security strings are missing.
- Keep security strings short enough to fit mobile screens.
- Avoid machine-translated wording for destructive or recovery flows unless reviewed.

## Automated Testing Priorities

The following flows should have automated tests or repeatable manual release checks:

- First app launch with no vault.
- First app launch with Android screen lock disabled.
- User opens Android security settings, enables screen lock, returns to xKey, and unlocks successfully.
- Biometric unlock success.
- Biometric failure followed by device PIN/password/pattern fallback.
- Device credential cancellation.
- Android screen lock changed after vault creation.
- Android screen lock removed after vault creation.
- Keystore key invalidation or missing wrapped key.
- Auto-lock after inactivity.
- Shake-to-lock when enabled.
- Clipboard copy and auto-clear.
- Private key/seed QR display and close.
- `.xkey` backup export.
- `.xkey` backup import with correct password.
- `.xkey` backup import with wrong password.
- CSV import and export.
- Vanity wallet generation cancellation and completion.
- Folder assignment for newly created wallets.
- Display scale changes and confirmation flow.
- Language switching.
- Light and dark theme readability.

Security regressions often happen at state boundaries: app restart, background/foreground transition, Android settings return, language switch, and migration from older app versions. Those areas should be tested before each release.

## Dependency and Supply-Chain Controls

Recommended dependency process:

- Keep `package-lock.json` committed.
- Run dependency audit before releases.
- Review high and critical advisories manually.
- Avoid adding packages for small utilities when local code is sufficient.
- Prefer actively maintained dependencies.
- Review native Capacitor plugins carefully because they run with Android permissions.
- Pin or carefully review major upgrades for cryptography, storage, file access, and biometric/device credential plugins.

Suggested commands:

```bash
npm audit
npm outdated
npm run lint
npm run build
npx cap sync android
```

For Android:

```bash
android/gradlew -p android assembleRelease bundleRelease
```

## Secure Development Rules

Contributors should follow these rules:

- Never commit private keys, seed phrases, real user wallets, signing keys, API secrets, or backup passwords.
- Never log decrypted wallet data.
- Never log vault keys.
- Never upload local notes such as `1/` or generated review files unless explicitly intended.
- Do not weaken encryption for convenience.
- Do not bypass authentication checks on sensitive screens.
- Do not introduce network sync for vault data without a separate security design.
- Keep destructive actions behind explicit confirmation.
- Prefer platform security APIs over custom authentication when possible.

## Reporting a Vulnerability

Please report security issues privately before opening a public issue.

Preferred contact:

- GitHub: https://github.com/haivcon/xKey

When reporting, include:

- A clear description of the issue.
- Affected platform: Android APK, Android Google Play build, or web.
- xKey version.
- Android version or browser version.
- Reproduction steps.
- Whether private keys, seed phrases, backups, clipboard data, or vault keys may be exposed.
- Any relevant logs with sensitive values removed.

Please do not include real private keys, seed phrases, backup passwords, or production wallet addresses unless they are test-only and safe to disclose.

## Security Response Expectations

The project should prioritize:

1. Issues that expose private keys, seed phrases, vault keys, or backup passwords.
2. Issues that allow vault unlock bypass.
3. Issues that break Android credential fallback or cause permanent lockout.
4. Issues that corrupt backups or prevent restore.
5. Issues that publish the wrong Android package, signing channel, or release artifact.
6. Issues that make security warnings unreadable or mistranslated.

Security fixes should include:

- Root cause explanation.
- User impact.
- Affected versions.
- Fixed version.
- Migration or recovery guidance when needed.
- Tests or release checklist updates when practical.

## User Safety Checklist

Users should:

- Set a strong Android screen lock.
- Keep biometric unlock enabled only on trusted devices.
- Make an encrypted `.xkey` backup.
- Store backup passwords safely.
- Test backup restore.
- Avoid copying private keys and seed phrases.
- Avoid showing sensitive QR codes in public.
- Keep the app updated.
- Verify the app source and release channel before storing sensitive data.

## Current Security Limitations

The following areas are known hardening targets:

- Move toward a fully explicit versioned encryption envelope.
- Add automated i18n completeness checks for security strings.
- Add automated tests for Android credential fallback edge cases.
- Add stricter release artifact verification.
- Expand dependency audit workflow.
- Improve documented recovery behavior for every lockout scenario.
- Consider screenshot blocking for sensitive screens.
- Consider stronger KDF settings for portable backups.

These are tracked as long-term improvements. They should be handled carefully to avoid breaking existing vaults.

## Final Note

xKey is designed to keep vault data local and under the user's control. That design improves privacy, but it also means the user is responsible for backups and device security.

If all local keys and backups are lost, xKey cannot recover the vault. This is expected for a private offline encrypted vault.
