<div align="center">
  <!-- TODO: Add Logo here: <img src="docs/logo.png" alt="xKey Logo" width="120" /> -->
  <h1>xKey - Offline Web3 Wallet Vault</h1>

  <p><strong>A private, offline-first cold vault for managing your Web3 assets securely.</strong></p>

  ![GitHub Release](https://img.shields.io/github/v/release/haivcon/xKey?color=blue&label=Latest%20Release)
  ![License](https://img.shields.io/github/license/haivcon/xKey?color=green)
  ![Android Build Status](https://img.shields.io/github/actions/workflow/status/haivcon/xKey/build-and-release-apk.yml?label=Build%20Status)
</div>

<br />

**xKey** is an offline-first Web3 wallet vault for managing wallet addresses, private keys, seed phrases, QR workflows, folders, tags, backups, CSV data, manual asset balances, and batch operations in a local encrypted app.

The project is open source, runs locally, and is designed as a private cold-vault style manager rather than a network-connected trading wallet.

---

## 📖 Table of Contents
- [✨ Core Features](#-core-features)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Installation & Setup](#-installation--setup)
- [📦 Release Workflow](#-release-workflow)
- [🔒 Security Notice](#-security-notice)
- [🤝 Contributing](#-contributing)
- [🔗 Links](#-links)

---

## ✨ Core Features

### 🔒 Security & Privacy
- **Local Vault:** Offline encrypted wallet vault with local AES-protected storage.
- **Authentication:** Android Device Credential unlock, Android Keystore integration, and web fallback authentication. Hardware-bound vault key mode for Android.
- **Integrity Checks:** Signed runtime integrity manifest, offline crypto KAT startup checks, and optional Root/Data Tamper Guard.
- **Resilience:** Self-healing Reed-Solomon vault/backup recovery and tamper-evident `.xkey` backup previews.
- **Audit & History:** Encrypted immutable audit log with a protected viewer.
- **Privacy Controls:** Secure display rendering, screen capture blocking, clipboard auto-clear, auto-lock controls, decoy vault, and kill switch.
- **Advanced Backups:** Offline Shamir's Secret Sharing (2-of-3) backups and encrypted portable `.xkey` files.

### 💼 Wallet Management
- **Organization:** Folder and tag organization with advanced filtering, sorting, search, and batch actions.
- **Vanity Addresses:** Vanity wallet generation with multi-threading.
- **Tracking:** Manual asset balance tracking with custom units.
- **Customization:** Configurable display scale and wallet density.

### 🧰 Offline Utilities
- **Native Support:** Native Android support through Capacitor 8.
- **Data Transfer:** QR scanning, display, sharing, and transfer workflows. CSV import/export functionality.
- **Localization:** Multi-language UI supporting `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

---

## 🛠 Tech Stack
- **Frontend Framework:** React, Vite
- **Cross-Platform:** Capacitor 8
- **Platform Targets:** Web, Android (Java 21+)
- **Runtime Environment:** Node.js 22+

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 22+
- Java 21+
- Android Studio for Android builds

### Install Dependencies
```bash
npm install
```

### Run Web Development Server
```bash
npm run dev
```

### Build Web App
Production builds require runtime-integrity signing keys. For local builds, keep them in `.env.local`. For GitHub Actions, configure them as repository secrets.
```bash
npm run build
```

### Sync Android Project & Build
```bash
npm run sync
npm run android
```

---

## 📦 Release Workflow

We document all version changes in our **[CHANGELOG.md](./CHANGELOG.md)**. 

GitHub Actions builds and signs release artifacts when a `v*` tag is pushed. Required repository secrets:
- `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- `XKEY_INTEGRITY_PUBLIC_KEY_PEM`, `XKEY_INTEGRITY_PRIVATE_KEY_PEM`

Example:
```bash
git tag v5.10.4
git push origin v5.10.4
```
*Generated files: `xKey-GitHub-v[VERSION].apk` and `xKey-GooglePlay-v[VERSION].aab` (package `com.haivcon.xkey`).*

---

## 🔒 Security Notice
Please read our comprehensive **[Security Policy](./SECURITY.md)** before using the app.

> [!WARNING]
> Never share private keys, seed phrases, `.xkey` backup files, backup passwords, Shamir shares, Android signing keys, or `XKEY_INTEGRITY_PRIVATE_KEY_PEM`.

xKey stores vault data locally and is designed for offline use. While we employ startup integrity checks, secure displays, and tamper guards, no software can fully protect against a completely compromised OS, rooted device with malicious intent, or physical camera recording.

---

## 🤝 Contributing

We welcome community contributions! Whether it's reporting bugs, suggesting features, or submitting pull requests.

Please read our **[Contributing Guidelines](./CONTRIBUTING.md)** to get started.

---

## 🔗 Links
- **Website:** [xlayer.my](https://xlayer.my)
- **X (Twitter):** [@haivcon](https://x.com/haivcon)
- **Telegram:** [@haivcon](https://t.me/haivcon)

## License
MIT License
