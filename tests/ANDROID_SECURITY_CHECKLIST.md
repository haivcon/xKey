# Android vanity / wallet security verification

Status: UNVERIFIED until performed on a dedicated test device. Chromium tests do not
verify native clipboard, biometrics, screen capture flags or Android lifecycle events.
No device was attached during this implementation. CI currently has no emulator job.

## Preparation
- Use a disposable vault; never import real funds/keys. Record Android version,
  WebView version, app build and device model in the test report (not shared memory).
- Build/install using the existing Capacitor Android workflow. Use a debug build only
  for WebView inspection. Do not enable WebView debugging in release builds.
- Set a real six-digit PIN through onboarding. Configure idle lock to one minute via
  Security settings, enable lock after secret copy, and leave screenshot protection on.
- Run `node tests/android-webview-check.mjs` for optional read-only attachment diagnostics.
  This is not a native security test and never clears app data or changes settings.

## Device cases (record PASS / FAIL / UNVERIFIED individually)
1. Generate/save at least 10 disposable wallets. In light and dark modes, inspect row
   separation before scrolling, after idle lock/PIN unlock and after app restart/unlock.
   Repeat expanded card, filtering, sorting and portrait/landscape transitions.
2. Enter an incorrect PIN: vault remains locked. Enter the correct PIN: vault opens.
3. Enable sensitive-copy blocking through its intended Security UI. Attempt generated
   mnemonic/private-key copy: blocked toast, unchanged clipboard, no copy-induced lock.
   Address copy must work and must not lock. Do not record clipboard secret content.
4. Disable copy blocking through Security UI. Copy a generated secret: lock immediately,
   then unlock with PIN. Confirm configured clipboard cleanup expires using a disposable
   secret only. Copy an address: no copy-induced lock. Check denied clipboard write if
   the device/OS supports permission denial; otherwise mark that case UNVERIFIED.
5. Start a hard vanity scan with keep-awake on. Observe increasing scan count before and
   after 30 seconds without touching the screen. At the configured idle deadline, app
   must lock despite worker progress. Repeat with a real tap at 30 seconds: lock deadline
   must reset. Confirm idle preference remains one minute after stopping/restarting.
6. While scanning, background/foreground the app and turn the screen off/on. Verify the
   configured background/screen-off lock behavior and no secret flash on return.
7. With enrolled biometrics, test success, cancel, failure and unavailable sensor. Cancel
   and failure must not expose the vault. Test device-credential fallback separately;
   document device-specific unsupported paths instead of marking them passed.
8. Verify screenshots, screen recording and recent-app preview protection; hidden balance
   on lock; sensitive reveal PIN/password and backup protection remain effective.

Never claim Android verification from a successful ADB launch or WebView connection.
