# 🔐 xKey — Offline Web3 Wallet Vault

**xKey** is a 100% offline, secure Web3 wallet management application built with React, Vite, and Capacitor 8. Designed as a cold vault for your crypto assets — featuring biometric authentication, AES-256 encryption, and full i18n support across 15 languages.

> **🛡️ Zero network connections. Your keys never leave your device.**

---

## 🚀 What's New in v5.2.0

### 🌐 xLayer Ecosystem Integration
- **Unified Portal**: Integrated xBot and xKey into a single monolithic xLayer portal via Vite Multi-Page Application (MPA) architecture.
- **Tailwind CSS v4**: Upgraded the entire project to Tailwind v4, utilizing native CSS `@theme` and `@import` capabilities.
- **Glassmorphism UI**: Harmonized design system across the new Landing Page, xBot dashboard, and xKey vault with seamless transition states.
- **CSS Engine Overhaul**: Fully refactored legacy `@apply` cross-references for strict Tailwind v4 compatibility.

---

<details>
<summary><b>📦 Previous Features (v5.1.0 & older)</b></summary>
<br>

### 🏗️ Major Architecture Refactoring (v5.1.0)
- **App.jsx**: Reduced from **859 → 470 lines** by extracting 4 custom hooks: `useWallets`, `useFileImport`, `useBackButton`, `useShakeToLock`.
- **SettingsScreen**: Reduced from **928 → 65 lines** by splitting into `GeneralTab`, `SecurityTab`, `DataTab` components.
- **Lazy Wallet Rendering**: New `WalletList` component with `useLazyList` hook — renders 50 wallets initially, infinite-scrolls more via IntersectionObserver.

### 🧭 URL-Based Routing
- **HashRouter Integration**: Replaced `currentView` state with `react-router-dom` HashRouter for Capacitor-safe offline routing.
- **Deep Linking**: Settings (`#/settings`) and Dashboard (`#/dashboard`) are now URL-addressable routes.
- **Back Button**: Android hardware back button navigates via router history instead of manual state management.

### 🔒 Security Hardening
- **Encrypted Auto-Backup Password**: Backup password is now AES-encrypted before storing in Preferences (was plaintext). Backward-compatible with existing vaults.
- **useMemo Optimization**: Filter/sort logic memoized with proper dependency arrays — no more recalculation on every render.

### 🏷️ Wallet Tags System
- **Tag Badges**: Color-coded tag pills displayed on wallet cards with consistent hash-based coloring.
- **Tag Editor**: In-wallet edit mode with autocomplete suggestions from existing tags.
- **Tag Filtering**: Filter wallets by tag via the ActionBar filter panel — dynamic tag pills appear automatically.

### 📦 Batch Operations
- **Selection Mode**: New toggle in ActionBar to enter multi-select mode. Clicking wallets toggles their selection state.
- **Bulk Actions**: Floating contextual action bar allows batch Delete, Move to Folder, Tag, and Pin operations across all selected wallets simultaneously.

### ↕️ Drag & Drop Reordering
- **Manual Sorting**: Select "Custom Order" from the sort menu to enable drag handles on wallet cards.
- **Touch Optimized**: Uses `@dnd-kit` with 200ms touch delay sensor to avoid conflicts with scrolling.
- **Persistent Order**: Drag changes are saved to storage immediately.

### 📝 Markdown Notes
- **Rich Text Rendering**: Wallet notes now render as markdown — supports **bold**, *italic*, `code`, links, lists, and headings.
- **Mono Editor**: Notes textarea uses monospace font with markdown syntax placeholder hints.
- **Zero Dependencies**: Lightweight custom MarkdownRenderer component, no external library needed.

### 📥 Multi-format Import
- **JSON Import**: Import wallet arrays from `.json` files with auto-field mapping (`address`, `privateKey`, `seedPhrase`, `mnemonic`, etc.).
- **Plain Text Import**: Import `.txt` files with one address per line.
- **Smart Detection**: File format is auto-detected by extension and content structure.

### ⚡ Performance
- **Lazy List Rendering**: Only 50 wallets render initially, with IntersectionObserver loading more on scroll.
- **Memoized Derivations**: `folders`, `filteredWallets`, `totalBalance`, `allTags` all properly memoized.

### 🛠️ TypeScript Foundation
- **Incremental Migration Ready**: Added `tsconfig.json` (allowJs=true) and core `types.ts` with `Wallet`, `SortOrder`, `FilterKey` interfaces.
- **Type Safety**: New files can be written in `.ts`/`.tsx` while existing `.jsx` files continue working.

</details>

---

<details>
<summary><b>📦 Previous Features (v4.0.12 & older)</b></summary>
<br>

### ⌨️ Dynamic UX & Keyboard Layout Management (v4.0.11)
- **Smart Auto-Scroll**: Smooth auto-scroll logic to push input fields into viewport center when keyboard appears.
- **Capacitor Keyboard Fix**: Switched to `KeyboardResize.Body` for reliable `keyboardWillShow` events.

### 📁 Advanced Offline Data Export (v4.0.11)
- **Scoped Storage Bypass**: Re-architected vault backup and CSV export to use `Directory.Cache` + native Share API.
- **Privacy First**: Files saved via system picker to Google Drive, Telegram, or Downloads.
- **Zero Permissions Needed**: Dropped `WRITE_EXTERNAL_STORAGE` requirement.

### 📷 High-Speed QR Vault Transfer (v4.0.11)
- **Optimized QR Density**: Halved chunk payload sizes for instant scanning on older cameras.
- **Haptic Scanning Engine**: Physical vibration feedback on each successful chunk read.
- **Resilient Camera Auto-Discovery**: Auto-select rear camera with explicit error alerts.

### 🌍 Ultimate Localization & i18n Perfection (v4.0.8)
- **100% Comprehensive Coverage**: Achieved full multi-language support across all 15 languages.
- **Hardcoded Text Eradication**: Refactored internal React UI components to completely replace hardcoded English text.
- **Missing Keys Resolved**: Translated advanced security features like **Decoy Vault**, **Shake to Lock**, **Kill Switch**, and **Auto Backup**.

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
