# 🔐 xKey — Offline Web3 Wallet Vault

**xKey** is a 100% offline, secure Web3 wallet management application built with React, Vite, and Capacitor 8. Designed as a cold vault for your crypto assets — featuring biometric authentication, AES-256 encryption, and full i18n support across 15 languages.

> **🛡️ Zero network connections. Your keys never leave your device.**

---

## 🚀 What's New in v4.0.8

### 🌍 Ultimate Localization & i18n Perfection
- **100% Comprehensive Coverage**: Achieved full multi-language support across all 15 languages (Arabic, German, Spanish, French, Hindi, Indonesian, Japanese, Korean, Portuguese, Russian, Thai, Turkish, Vietnamese, Chinese, and English).
- **Hardcoded Text Eradication**: Refactored internal React UI components (like `ErrorBoundary`, `CreateWalletModal`, and `SettingsScreen`) to completely replace hardcoded English text with dynamic `t()` locale keys.
- **Missing Keys Resolved**: Accurately translated and injected previously missing advanced security features like **Decoy Vault**, **Shake to Lock**, **Kill Switch**, and **Auto Backup** across all foreign language files, eliminating jarring English fallbacks.
- **UI/UX Polish**: Fixed spacing and display issues caused by variable string lengths across different languages (especially in Asian languages like Japanese and Chinese).

---

<details>
<summary><b>📦 Previous Features (v4.0.7 & older)</b></summary>
<br>

### 🤖 Automated CI/CD Pipeline
- **GitHub Actions Integration**: Pushing a `v*` tag now automatically triggers a cloud build.
- **Auto-Signing**: Securely injects Base64 keystores to sign Release APKs dynamically.
- **GitHub Releases**: The final APK is automatically attached to the GitHub Releases page with versioning (e.g., `xKey-Release-v4.0.7.apk`).

### 📱 Premium Native Experience
- **Cinematic Splash Screen**: Utilized advanced CSS backdrop-blur outpainting techniques to ensure the app's logo scales perfectly across all aspect ratios without cropping.
- **Native Android Icons**: Integrated `@capacitor/assets` to automatically generate all 87 adaptive launcher icons and splash screens directly from the source logo.

### 🔒 Enhanced Security & Architecture
- **Biometric Fallback Optimization**: Fixed a critical bypass where devices without fingerprint hardware skipped authentication. The app now properly triggers the OS-level Device Credential fallback (PIN/Pattern/Password).
- **Capacitor 8 Upgrade**: Migrated the build system to support the latest Android SDKs, enforcing Node.js 22 and Java 21 architectures.
- **1-Click Dev Script**: Added the `npm run android` shortcut to automatically build Vite, sync Capacitor, and launch Android Studio in a single command.

### Complete Rebrand & UI
- **XBOT Check → xKey**: Complete identity migration.
- **Theme Toggle**: Gradient toggle with Sun/Moon icon inside the knob.

### Wallet Management
- **Inline Wallet Editing**: Edit name, address, private key, seed phrase, balance, notes.
- **AES-256 Encryption**: All private keys and seed phrases encrypted locally.
- **Folder Organization**: Import wallets via CSV, auto-group by filename.
- **Duplicate Detection**: Smart filter to find and remove duplicate addresses.
- **Password-Protected Backups**: AES-encrypted `.xkey` files, portable across devices.
</details>

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v22+
- [Android Studio](https://developer.android.com/studio) (for APK builds)
- Java 21+

### 1. Clone & Install
```bash
git clone https://github.com/haivcon/xKey.git
cd xKey
npm install
```

### 2. Run Locally (Web Mode)
```bash
npm run dev
```

### 3. Build & Open Android Studio (1-Click)
```bash
npm run android
```
> *This automatically runs `vite build`, `cap sync`, and opens the native Android project.*

---

## ⚠️ Security Notice

- **Never share your `.xkey` backup files or the password used to encrypt them.**
- This app stores sensitive Private Keys. Always ensure your device has a secure screen lock (PIN/Password/Biometrics) enabled.
- If you remove your device's screen lock, Android Keystore will drop biometric keys, rendering the vault inaccessible to protect your assets.
- **This app is 100% offline.** No data is ever transmitted over the network.

---

## 📄 License

MIT License
