# Changelog

All notable changes to this project are documented here.

## [5.21.4] - Current Release

### Release Focus

v5.21.4 focuses on critical security tab fixes, addressing UI logic bugs that previously locked out features or behaved unexpectedly during configuration.

### Upgraded Features

- **Biometric UI Fix:** Resolved an issue where PIN, Kill Switch, Decoy Vault, and Shake-to-lock configurations were entirely hidden if the device had biometrics enabled.
- **PIN Configuration Flow:** Fixed a logical bug preventing users without a PIN from setting a new one through the Settings tab.
- **Decoy PIN Storage:** Standardized the decoy PIN hash storage key across all components.
- **Security Guard Enhancements:** Added a busy-state guard to prevent rapid double-clicks on the Device Integrity toggle, and improved Screen Capture Protection logic to properly gracefully fail on unsupported environments instead of showing incorrect status indicators.
- **Master Password Removal:** Added robust error handling and fallback catch blocks during master password removal to prevent the UI from getting stuck in a loading state.
- **App Version Bump:** Bumped app version to `5.21.4` (Android versionCode 89).

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

## [5.21.3]
- Critical fixes for duplicate settings tabs.
- Removed duplicate Danger Zone configurations.
- Fixed device integrity logic and screen capture issues in test cases.

## [5.21.1]
- Vanity Address Responsive Scaling.
- Fixed Width Calculation Logic.

## [5.21.0]
- Duplicate Detector UI Enhancement.
- Improved Alignment.

## [5.20.0]
- Splash Screen Fix for light theme logo.
- Vite Asset Resolution.

</details>