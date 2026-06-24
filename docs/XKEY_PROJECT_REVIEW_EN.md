# xKey Project Review Repor

Review Date: 2026-06-16
Current Version: 5.7.0
Scope: React/Vite source code, Capacitor Android, storage, security, UI, multi-language, build, and product direction.

## 1. Project Purpose

xKey is an offline-first Web3 wallet vault management application. The app allows users to store wallet addresses, private keys, seed phrases, notes, labels, folders, QR codes, `.xkey` backup files, CSV data, and asset balances locally on the device.

The core goal of xKey is to be a local "private key vault", not an online transaction wallet. Users can use xKey to:

- Manage multiple Web3 wallets in an encrypted vault.
- Store private keys and seed phrases in local encrypted format.
- Create new wallets, import wallets manually, generate vanity wallets by prefix/suffix.
- Group wallets by folders, labels, networks, pinned status, or balances.
- Backup/restore using password-protected `.xkey` files.
- Export CSV when inventory or auditing is needed.
- Scan, display, share, and download QR codes for addresses or wallet data.
- Track balances manually in optional units such as `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, points, or custom labels.
- Use Android Device Credential to unlock the vault with the device's fingerprint, face, PIN, password, or pattern.

## 2. Current Strengths

### Security and Storage

- Wallet data is encrypted locally, fitting the offline vault goal.
- Sensitive fields like private keys and seed phrases are additionally encrypted at the field level before the entire wallet list is encrypted.
- Android native has a dedicated Device Credential plugin, using the Android Keystore to wrap the vault key.
- `android:allowBackup="false"` is set in AndroidManifest, reducing the risk of unintended app data backups.
- Includes mechanisms like auto-lock on inactivity, clipboard auto-clear, privacy shield when app is inactive, and master password prompts when viewing sensitive data.
- Supports wipe/reset when the vault encounters a critical error.

### User Experience

- The home page supports a responsive layout, with a multi-column wallet list on large screens and optimization for mobile.
- Features customizable display scaling from 5% to 200%, suitable for small devices or users wanting to view more data.
- Provides dense/compact/ultra compact modes for the wallet list.
- Buttons for copy, QR, expand wallet, add wallet, tools, search, filter, and sort are placed close to the actual workflow.
- Features a vanity wallet folder, NEW labels, a glowing ring for newly created wallets, and auto-navigation to the folder containing the new wallet.
- The balance edit modal includes search, paste, address copy, CSV import, filter, and draft autosave.
- Toasts/confirms have been revamped to look more professional and tend to scale according to the display ratio.

### Features

- Create regular wallets, import manually, and generate vanity wallets using a dedicated worker.
- Backup `.xkey`, import/export CSV, duplicate detector, analytics, advanced tools.
- Password-protected QR transfer, QR scanner, QR share/download.
- Supports popular networks: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Multi-language support with 15 languages.
- Version is fetched from `package.json`/native app info and displayed in-app.

### Build and Android

- `npm run lint` completes successfully.
- `npm run build` completes successfully.
- `npx cap sync android` successfully syncs web assets to Android.
- Android version is currently `versionName "5.7.0"` and `versionCode 57`.
- `.gitignore` properly excludes `1/`, build artifacts, signing secrets, `.xkey`, APK/AAB, and local files.

## 3. Weaknesses and Potential Issues

### High Level

1. Dependencies have security warnings from `npm audit`.

   Running `npm audit --omit=dev` reports:

   - `vite 8.0.0 - 8.0.15`: high severity, related to Windows path/UNC in the dev server.
   - `ws` via `ethers`: high/moderate severity. `npm audit fix --force` suggests downgrading `ethers` to major 5, which could cause breaking changes.

   Recommendation: Safely update Vite within the patch/minor range first. For `ethers/ws`, check for a newer `ethers` version or override `ws` if supported upstream; avoid blindly using `--force`.

2. Android release has not enabled shrink/minify.

   `android/app/build.gradle` currently has `release { minifyEnabled false }`. This doesn't crash the app, but makes the APK/AAB easier to reverse engineer and larger in size.

   Recommendation: Try enabling R8/ProGuard for release, add keep rules for Capacitor/plugins if needed, and test thoroughly before publishing.

3. Fallback AES key is still stored in Preferences.

   The code currently stores `xkey_aes_fallback` for recovery or web/fallback compatibility. This is a tradeoff to reduce the risk of vault loss when changing device lock methods, but in terms of native Android security, it is weaker than keeping the key only in Keystore.

   Recommendation: Clearly separate the two modes:
   - Android Secure Mode: Key is only unwrapped via Keystore/device credential.
   - Compatibility Mode: Keeps the fallback key, with a clear warning displayed to the user.

4. Some secondary translations still contain English strings.

   Automated checks show many locales like `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` still have strings like `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Recommendation: Create an i18n check script in CI to fail the build when a locale is missing keys or still has important raw keys.

### Medium Level

1. Locales missing keys in multiple languages.

   Compared to `en.js`, most locales other than `vi` are missing:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Because `LanguageContext` falls back to English, the app doesn't crash, but the multi-language experience is incomplete.

2. `chainBulk` is an extra key in many locales.

   Many locales have the `chainBulk.*` group, but `en.js` does not. These might be legacy keys or unsynchronized keys. While not causing direct errors, they make translation management difficult.

3. CryptoJS AES passphrase mode is not the most modern encryption standard.

   `CryptoJS.AES.encrypt(data, key)` works, but is not as explicit as a standard model with dedicated salt/KDF/IV/auth tags. AES-GCM or WebCrypto would be easier to audit.

   Long-term recommendation: Migrate the vault format to WebCrypto AES-GCM, with explicitly defined PBKDF2/Argon2id parameters, versioned payloads, and mandatory authentication tags.

4. Master password uses PBKDF2 with 10,000 iterations.

   This level is somewhat low by today's standards for protecting sensitive data. While it's a secondary password for viewing private keys/seeds and not the main vault key, it should still be increased.

   Recommendation: Increase iterations based on device benchmarks, and store the version hash so migrations don't corrupt old data.

5. Clipboard auto-clear is not absolutely guaranteed across all platforms.

   The code checks if the clipboard still holds the correct value before clearing, which is a good approach. However, Android/browsers may restrict clipboard writes when not triggered by a user gesture.

   Recommendation: Clearly describe in the UI that "xKey will attempt to clear the clipboard if the OS allows", without absolute promises.

6. Lack of practical automated tests.

   The project has linting and building, but lacks unit/e2e tests for critical flows like unlock, import/export, vanity wallet creation, balance editing, clipboard operations, and i18n.

   Recommendation: Add smoke tests using Playwright for web and a checklist for Android instrumentation/manual release testing.

### Low Level

1. `console.error` remains in a few places.

   Not critical, but should be grouped into a logger or dev-only environment to avoid leaking unnecessary stacks in production.

2. Vite warns about large chunks.

   The `index` and `scan` chunks are large. This isn't a runtime error, but could slow down app loading on low-end devices.

   Recommendation: Lazy load the QR scanner, ethers-heavy paths, advanced tools, and deeper dashboard views.

3. Some UI elements might break at very low or very high scale ratios.

   The app handles scaling well in many areas, but large modals, QR codes, dense forms, bottom sheets, and wallet cards still need testing at 5%, 50%, 75%, 100%, 150%, and 200%.

## 4. Feature Group Evaluation

### Unlock Security

The Android Device Credential approach is correct, as it lets the OS handle biometrics and fallback to PIN/password/pattern. The main risk lies in the migration between the old PIN mechanism, fallback keys, and Keystore keys.

Recommendations:
- Provide a "Vault Security Status" screen: Android Secure, Web Fallback, Compatibility, requires device lock setup.
- If an invalidated key is detected, do not auto-generate a new vault key if the old vault still contains ciphertext; guide the user to recovery/wipe instead.
- Log internal unlock statuses without logging sensitive data.

### Vanity Wallet Generation

Using a separate worker is correct as it prevents the UI from freezing. Recent upgrades like wallet quantity, auto-save to folder, pausing auto-lock during generation, time limits, and long pattern warnings are all reasonable.

Recommendations:
- Clearly display probability/estimated time based on pattern length.
- Allow pausing/resuming/stopping the job.
- Save a history of generated jobs so users know which wallets came from which batch.
- Provide strong warnings for overly long patterns on mobile.

### Asset Balance Editing

The current workflow fits users who verify addresses on block explorers then input balances manually. Strengths include search, copy address, paste, filter, CSV support, and draft autosave.

Recommendations:
- Add a "step-by-step verification" mode: screen shows 1 wallet at a time, full address, copy button, explorer link by network, and a large input field.
- Allow marking as "checked" to avoid skipping entries.
- Allow CSV imports with columns `address,balance,unit,network`.
- Add an undo feature for the last edit.

### Multi-Language

Falling back to English prevents UI breakage, but a product targeting an international audience needs stricter translation control.

Recommendations:
- Create an `npm run i18n:check` script.
- Report missing keys, extra keys, and raw translation keys in the UI.
- Prioritize accurate translations for security, backup, wipe, private key, and seed phrase groups.

### Android Release

The current configuration is sufficient for building and syncing, but release hardening is lacking.

Recommendations:
- Enable minify for release after testing.
- Add an `npm audit --omit=dev` CI step with a clear allowlist.
- Build APK/AAB via GitHub Actions on tag pushes.
- Keep versioned release notes in the repository.

## 5. Proposed Upgrade Ideas

### Short Term

- Fix all missing translation keys: `common.warning`, `createWallet.vanityLongTitle`.
- Clean up lingering English strings in other locales.
- Add an i18n check script to the CI.
- Update Vite to resolve the current advisory.
- Add a "Security Status" page in settings.
- Add a clear note that clipboard auto-clear is best-effort.
- Add an "open in explorer" button by network in the balance edit modal.
- Add undo snackbars for wallet deletion, balance edits, and folder changes.

### Medium Term

- Migrate encryption format to versioned WebCrypto AES-GCM.
- Separate Android Secure Mode and Compatibility Mode.
- Add Playwright smoke tests for main flows.
- Lazy load scanner/analytics/advanced tools to reduce the initial bundle size.
- Add settings export/import that excludes sensitive data.
- Add a "Vault Audit" mode: wallets missing backups, duplicate addresses, missing networks, missing names, or private keys not matching addresses.

### Long Term

- Build an official recovery guide for scenarios like changing devices, changing screen locks, losing biometrics, or losing `.xkey` files.
- Add encrypted multi-device transfer via multi-part QR codes or temporary files.
- Add a hardware-backed-only option for high-security users.
- Add address validation via checksum/network.
- Provide paper backup templates: address, network, notes, excluding private keys if chosen by the user.
- Better desktop/PWA support for using xKey as a desktop offline vault.

## 6. Future Product Direction

xKey should pursue the path of a "professional offline vault for users with many wallets". It should not be turned into an online transaction wallet prematurely, as that increases security risks, RPC dependencies, phishing vectors, transaction signing liabilities, and attack surfaces.

Appropriate Direction:
1. Prioritize data safety: backup, restore, migration, clear warnings, vault auditing.
2. Prioritize rapid management of many wallets: folders, tags, filters, batch edits, CSV, QR, vanity generation.
3. Prioritize stable Android native features: Device Credential, Keystore, clipboard management, file picker, QR share/download.
4. Prioritize a dense but clear UI: scaling, compact mode, responsive tablet layouts, short toasts, non-blocking modals.
5. Prioritize transparency: Security Status, release notes, explicit versioning in-app, backup and wipe guides.

## 7. Conclusion

The project has a solid foundation: feature-rich, clear offline-first approach, Android Credential integration is on the right track, the UI is heavily optimized for mobile/tablet, and it boasts a comprehensive wallet management toolset.

The top priorities moving forward are not adding numerous new features, but making the app "harder to break":
- Complete the i18n implementation.
- Harden the Android release.
- Clarify the Keystore/fallback security model.
- Add automated tests for critical flows.
- Manage dependency audits.
- Standardize the encryption format for the long term.

If these points are addressed well, xKey can grow into a highly reliable offline vault tool for users managing multiple Web3 wallets.
