# 🔐 xKey — Offline Web3 Wallet Vault

**xKey** (formerly XBOT Check) is a 100% offline, secure Web3 wallet management application built with React, Vite, and Capacitor. Designed as a cold vault for your crypto assets — featuring biometric authentication, AES-256 encryption, and full i18n support across 15 languages.

> **🛡️ Zero network connections. Your keys never leave your device.**

---

## 🚀 What's New in v3.0.0

### Complete Rebrand: XBOT Check → xKey
- **New Identity**: App name, package ID (`com.haivcon.xkey`), logo, and all internal references migrated from `xbot` to `xkey`
- **New Logo**: Custom-designed xKey mascot with animated floating + glow effects
- **Backup Format**: `.xbot` → `.xkey` file extension for encrypted backups

### Inline Wallet Editing
- **Edit any field** directly from the wallet card: name, address, private key, seed phrase, balance, notes
- Save/Cancel buttons with persistent encrypted storage
- Fixed identity-matching bug (uses reference-based lookup instead of field-based)

### Premium UI Overhaul
- **Theme Toggle**: Gradient toggle with Sun/Moon icon inside the knob (indigo ↔ amber)
- **Language Picker**: 3-column grid with country flags, animated expand/collapse, checkmark badge for active language
- **Light Mode**: Fixed contrast issues — forced dark text on headings, white input backgrounds, proper placeholder colors
- **Logo Animation**: CSS floating + glow keyframes on the header logo

### Full i18n Coverage (15 Languages)
All UI strings — including "Vault" translations, wallet editing, settings, and error messages — are fully localized:

| Language | Vault Translation | Code |
|----------|------------------|------|
| 🇺🇸 English | Vault | `en` |
| 🇻🇳 Vietnamese | Kho | `vi` |
| 🇨🇳 Chinese | 密钥库 | `zh` |
| 🇰🇷 Korean | 키 금고 | `ko` |
| 🇯🇵 Japanese | キー金庫 | `ja` |
| 🇷🇺 Russian | Хранилище | `ru` |
| 🇮🇳 Hindi | तिजोरी | `hi` |
| 🇸🇦 Arabic | خزنة | `ar` |
| 🇮🇩 Indonesian | Brankas | `id` |
| 🇹🇭 Thai | ตู้เซฟ | `th` |
| 🇫🇷 French | Coffre-fort | `fr` |
| 🇪🇸 Spanish | Bóveda | `es` |
| 🇧🇷 Portuguese | Cofre | `pt` |
| 🇩🇪 German | Tresor | `de` |
| 🇹🇷 Turkish | Kasa | `tr` |

### Auto Language Detection
- First launch automatically detects device language via `navigator.language`
- Falls back to English if the device language is not supported

### Internal Key Migration
All storage keys, biometric IDs, and file extensions migrated from `xbot*` to `xkey*` for a clean identity:
- `xkey_wallets`, `xkey_aes_fallback`, `xkey_theme`, `xkey_language`
- Biometric server: `app.xkey.vault`
- Backup extension: `.xkey`

---

<details>
<summary><b>📦 Previous Features (v2.x)</b></summary>
<br>

- **🔒 AES-256 Encryption**: All private keys and seed phrases encrypted locally
- **👁️ Biometric Auth**: Native Android Biometrics (FaceID / Fingerprint)
- **📁 Folder Organization**: Import wallets via CSV, auto-group by filename
- **🧹 Duplicate Detection**: Smart filter to find and remove duplicate addresses
- **📊 Dashboard Analytics**: Total valuation, folder distribution, wallet statistics
- **📜 CSV Export**: Export wallet data with column selection
- **💾 Password-Protected Backups**: AES-encrypted `.xkey` files, portable across devices
- **🔄 Manual Wallet Creation**: Generate BIP-39 wallets offline (pure math, no internet)
- **⏱️ Auto-Lock**: 5-minute inactivity timeout with biometric re-auth
- **🔍 Search & Filter**: Filter by PK, seed phrase, balance; sort by name, date, balance

</details>

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Android Studio](https://developer.android.com/studio) (for APK builds)
- Git

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
> **Note**: Biometric auth and filesystem features require native Capacitor plugins (mocked in browser).

### 3. Build Android APK
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```
APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📖 How to Use

1. **First Launch** — App binds to device biometrics automatically
2. **Import Wallets** — Click `+` to import CSV or `.xkey` backup file
3. **Create Wallets** — Generate BIP-39 wallets offline (12-word mnemonic)
4. **Edit Wallets** — Tap a wallet → Edit button → modify any field → Save
5. **Manage Folders** — Double-tap folder tab to rename or delete
6. **Backup** — Settings → Create Encrypted Backup → set password → export `.xkey` file
7. **Restore** — Import a `.xkey` file → enter backup password

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TailwindCSS v4, Lucide Icons |
| Crypto | ethers.js v6 (BIP-39/BIP-32 wallet generation) |
| Mobile | Capacitor 8 (Android) |
| Security | CryptoJS AES-256-CBC, Capgo Native Biometric |
| i18n | 15 languages, auto-detection, persistent preference |

---

## ⚠️ Security Notice

- **Never share your `.xkey` backup files or the password used to encrypt them.**
- This app stores sensitive Private Keys. Always ensure your device has a secure screen lock (PIN/Password/Biometrics) enabled.
- If you remove your device's screen lock, Android Keystore will drop biometric keys, rendering the vault inaccessible to protect your assets.
- **This app is 100% offline.** No data is ever transmitted over the network.

---

## 📄 License

MIT License
