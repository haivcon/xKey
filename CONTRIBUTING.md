# Contributing to xKey

Thank you for helping improve xKey. Contributions are welcome when they preserve the project's offline-first, local-vault security model.

---

## Security First

Do not report security vulnerabilities in public issues or discussions. Use the private reporting process in [SECURITY.md](./SECURITY.md#reporting-a-vulnerability).

Never include private keys, seed phrases, wallet backups, backup passwords, QR recovery shares, or sensitive screenshots in issues, pull requests, tests, logs, or commits.

---

## Project Principles

xKey should remain offline-first, non-custodial, free of telemetry requirements, explicit about secret reveal/export actions, careful with CPU-heavy vanity generation, and clear about backup/recovery responsibilities.

Out of scope: custody, remote key recovery, hidden uploads, analytics requirements, or server-side wallet access.

---

## Development Setup

```bash
git clone https://github.com/haivcon/xKey.git
cd xKey
npm install
npm run dev
```

Android/Capacitor work requires Android Studio and a compatible Java/Gradle environment.

---

## Quality Checks

Before opening a pull request or publishing a release, run:

```bash
npm run type-check
npm run build
```

Recommended focused checks for sensitive areas:

```bash
npm run test
npm run locale:audit
npm run test:smoke
```

---

## Pull Request Guidelines

1. Create a focused branch from `main`.
2. Keep changes scoped and explain why they are needed.
3. Add or update tests when behavior changes.
4. Update documentation when user-facing behavior, security assumptions, release steps, or build metadata changes.
5. Do not commit generated build artifacts, local secrets, `.env` files, APK/AAB files, or the local `1/` instruction folder.
6. Use clear English commit messages.

---

## Localization Guidelines

Supported locales: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`.

When editing translations, preserve placeholders, keep security warnings unambiguous, update all locale files when adding user-facing keys, and run locale audits when translation keys change.

---

## Release Checklist

For release work:

- Update `package.json`, `package-lock.json`, and `android/app/build.gradle` together.
- Update `README.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `ARCHITECTURE.md` when relevant.
- Keep older release details summarized so the current release stays easy to read.
- Ensure `.gitignore` excludes local scratch folders such as `1/`.
- Confirm `git ls-files 1` is empty before committing.
- Use annotated `v*` git tags for GitHub Actions release builds.

Current release target: `v5.22.1`.
