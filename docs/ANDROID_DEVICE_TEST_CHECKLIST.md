# Android Device Test Checklist

Use this checklist after installing a debug or release APK on a real Android device.

## Basic launch

1. Open xKey from the launcher.
2. Unlock with device credential or PIN.
3. Confirm the home screen renders without horizontal overflow.
4. Switch light/dark/AMOLED themes and verify text contrast.

## Backup open intent

Replace the path with an existing `.xkey` file on the device:

```powershell
adb shell am start `
  -a android.intent.action.VIEW `
  -d "file:///sdcard/Download/test.xkey" `
  -t "application/octet-stream" `
  com.haivcon.xkey
```

Expected result:

- xKey opens if installed.
- Restore dialog appears after unlock.
- Dialog shows `Opened from external app`, backup ID, file hash, and integrity state.
- `Verify only` does not import wallets.

## Export and verify

1. Export a `.xkey` backup and save it to Downloads.
2. Use `Verify saved backup` from the backup history card.
3. Reopen the saved file from Files app.
4. Confirm metadata preview is readable before entering the backup password.

## CSV export safety

1. Export CSV without private key/seed phrase.
2. Export CSV with sensitive columns and confirm the warning is visible.
3. Save a named CSV file to Downloads.
4. Confirm xKey does not reopen itself after saving CSV.

## Vanity wallet generation

1. Start vanity generation with 2-4 characters.
2. Toggle Eco, Balanced, and Fast modes.
3. Force close the app while results exist.
4. Reopen xKey and confirm encrypted session recovery is offered.

## Backup restore modes

1. Open a valid `.xkey`.
2. Enter password and press Preview.
3. Confirm Merge and Replace descriptions are visible.
4. Test Merge with duplicate wallets.
5. Test Replace only after preview and confirmation.
6. Use Undo after Replace and verify the previous vault returns.

## Logs and health

1. Open Settings > Audit Log.
2. Unlock the log.
3. Search action history.
4. Filter by Backup, Copy, Warning, and severity.
5. Confirm health banner appears only when pending backup/session state exists.
