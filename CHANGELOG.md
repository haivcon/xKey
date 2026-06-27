# Changelog

All notable changes to this project are documented here.

## [5.21.8] - Current Release

### UI & Interaction Enhancements
- **Lite Mode Relocated:** Moved Lite Mode toggle from Feedback to the Appearance section for better visibility.
- **Tactile Effects:** Added subtle press scaling, hover shadows, and smooth ripple effects to buttons and glass cards (disabled in Lite mode).
- **Toast Alignment:** Centered all toast notifications using a robust CSS grid layout.
- **Slogan Formatting:** Slogan toasts now display the "NOT YOUR KEY, NOT YOUR CRYPTO" slogan on its own dedicated centered line.
- **Notice Components:** Centered content in small notice cards across the app.

### Under the Hood
- Re-architected toast CSS grid to accommodate automatic sizing of action buttons.
- Updated `package.json` and `build.gradle` to version 5.21.8 (versionCode 93).

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

## [5.21.7]

### Release Focus

v5.21.7 translates the names of color themes (Pink Rose, Blue Sapphire, Red Ruby, Purple Amethyst, Emerald Vault) into all supported localized languages.

### Upgraded Features

- **Localized Theme Names:** Translated color theme settings into Arabic, German, Spanish, French, Hindi, Indonesian, Japanese, Korean, Portuguese, Russian, Thai, Turkish, Vietnamese, and Simplified Chinese.
- **Improved Update Scripts:** Updated the locale automation script (`update-locales.cjs`) to prevent the accidental injection of English fallback names into other localized files during future updates.
- **App Version Bump:** Bumped app version to `5.21.7` (Android versionCode 92).

<details>
<summary>Previous release history is collapsed to keep the current release notes focused.</summary>

## [5.21.6]
- Native App-only DPI Override.
- No System-wide DPI Mutation.
- Persisted DPI Preference.

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