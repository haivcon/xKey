# Contributing to xKey

First off, thank you for considering contributing to xKey! It's people like you that make xKey a great, secure tool for the Web3 community.

We welcome all kinds of contributions: bug reports, feature suggestions, code contributions, translation improvements, and documentation updates.

---

## 🛡️ Important Security Note

**Do NOT report security vulnerabilities in public issues!** 

If you have discovered a security vulnerability, please refer to our **[Security Policy](./SECURITY.md#reporting-a-vulnerability)** on how to report it privately.

---

## 🐛 Reporting Bugs

If you find a bug, please create a GitHub Issue and include:
- Your operating system and device model.
- The xKey version you are using.
- Detailed steps to reproduce the bug.
- Expected behavior vs actual behavior.
- Screenshots or logs (make sure to **remove/blur any sensitive information** like wallet addresses or keys).

## 💡 Suggesting Features

We love new ideas! When requesting a feature, please:
- Check existing issues to see if it has already been suggested.
- Explain the use case and why it would be beneficial for the offline vault model.
- Remember that xKey is designed as a *local, offline-first vault*, not a hot wallet with network connectivity. Features that require remote servers or telemetry will likely be rejected.

## 🛠️ Development Setup

To contribute code, you'll need to set up the project locally.

### Prerequisites
- Node.js 22+
- Java 21+
- Android Studio (if working on Android native features)

### Installation
1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/xKey.git
   cd xKey
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the web development server:
   ```bash
   npm run dev
   ```

### Code Style & Quality
- We use ESLint and Prettier. Please ensure your code passes linting before submitting a PR:
  ```bash
  npm run lint
  ```
- Before pushing, make sure the project builds successfully:
  ```bash
  npm run build
  ```

## 🔀 Pull Request Process

1. Create a new branch for your feature or bugfix (`git checkout -b feature/your-feature-name`).
2. Make your changes and commit them with clear, descriptive commit messages.
3. Push your branch to your fork (`git push origin feature/your-feature-name`).
4. Open a Pull Request against the `main` branch of the original xKey repository.
5. In the PR description, explain what changes were made and why. Link any related issues.
6. A maintainer will review your PR. Be prepared to make requested changes.

## 🌐 Translations

xKey supports multiple languages. If you find a translation error or want to add a new language, feel free to submit a PR modifying the JSON/JS translation files in the `src/locales` directory. 

*Note: Please ensure security-critical strings (like backup warnings) are translated accurately and unambiguously.*

---

Thank you for contributing!
