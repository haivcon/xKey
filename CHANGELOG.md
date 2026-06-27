# Changelog

All notable changes to this project are documented here.

## [5.21.6] - Current Release

### Release Focus

v5.21.6 introduces Android app-only DPI controls for xKey. The upgrade lets users adjust the xKey Activity/WebView display density without changing system-wide Android DPI and without enabling Developer Options.

### Upgraded Features

- **Native App-only DPI Override:** Added a `DpiOverride` Capacitor plugin for Android Activity/WebView density control.
- **No System-wide DPI Mutation:** The new DPI mode is scoped to xKey, keeping other Android apps on the device's original display density.
- **Persisted DPI Preference:** The selected app DPI is saved locally and reapplied on startup; disabling the mode restores system DPI behavior.
- **Safe Web Fallback:** Non-Android and unsupported environments continue to use CSS interface scaling as a fallback.
- **Clear Upgrade Copy:** Updated English and Vietnamese settings text to explain app-only DPI behavior, fallback scaling, and Activity reloads.
- **App Version Bump:** Bumped app version to `5.21.6` (Android versionCode 91).

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