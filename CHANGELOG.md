# Changelog

All notable changes to this project are documented here.

## [5.21.5] - Current Release

### Release Focus

v5.21.5 fixes the Android header slogan layout regression on high-DPI and narrow mobile viewports while retaining all v5.21.4 security and settings fixes.

### Upgraded Features

- **Header Slogan Responsive Fix:** Fixed the `NOT YOUR KEY, NOT YOUR CRYPTO` header slogan being squeezed, overlapped, or clipped on Android devices around 360–480 CSS px wide.
- **Cross-Device Layout Guard:** Added safer overflow handling, mobile font sizing, spacing, and wrapper behavior so the slogan does not overlap the brand/title or action buttons.
- **Visual Regression Coverage:** Added Playwright responsive visual/layout checks for Android viewport widths `360`, `390`, `412`, `430`, and `480` CSS px.
- **App Version Bump:** Bumped app version to `5.21.5` (Android versionCode 90).
- **Previous v5.21.4 fixes retained:** Security tab, PIN configuration, decoy PIN storage, Device Integrity guard, Screen Capture Protection, and master password removal fixes remain included.

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