# Contributing to xKey

Thank you for helping improve xKey. Contributions are welcome when they preserve the project's offline-first, local-vault security model.

You can contribute with bug reports, feature proposals, documentation updates, translations, tests, and code improvements.

---

## Security First

Do not report security vulnerabilities in public issues or discussions.

Use the private reporting process in [SECURITY.md](./SECURITY.md#reporting-a-vulnerability). Remove or blur private keys, seed phrases, wallet addresses, backup files, QR codes, screenshots, and logs before sharing diagnostic material.

---

## Project Principles

xKey should remain:

- Offline-first.
- Local-only by default.
- Non-custodial.
- Free of telemetry requirements.
- Explicit about secret reveal/copy actions.
- Careful with CPU-intensive workflows such as vanity wallet generation.
- Clear about backup, recovery, and user responsibility.

Features that require custody, remote key recovery, hidden background uploads, analytics tracking, or server-side wallet access are out of scope.

---

## Development Setup

### Prerequisites

- Node.js 22+
- npm
- Java 21+
- Android Studio if working on Android or Capacitor native features

### Install

```bash
git clone https://github.com/haivcon/xKey.git
cd xKey
npm install
```

### Run Locally

```bash
npm run dev
```

### Build and Sync Android

```bash
npm run build
npx cap sync android
```

---

## Quality Checks

Before opening a pull request or publishing a release, run the relevant checks:

```bash
npm run lint
npm run type-check
npm run test:vanity
npm run build
npx cap sync android
```

Additional targeted tests may be useful:

```bash
npm run test:key-health
npm run test:shamir
npm run test:reed-solomon
npm run locale:audit
```

---

## Pull Request Guidelines

1. Create a focused branch from `main`.
2. Keep changes scoped and explain why they are needed.
3. Add or update tests when behavior changes.
4. Update documentation when user-facing behavior, security assumptions, release steps, or build metadata changes.
5. Do not commit generated build artifacts, local secrets, `.env` files, APK/AAB files, or the local `1/` instruction folder.
6. Ensure private keys, seed phrases, backup passwords, and QR recovery shares never appear in commits, screenshots, test fixtures, or logs.
7. Use clear English commit messages.

---

## Localization Guidelines

xKey supports:

`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `th`, `tr`, `vi`, `zh`

When editing translations:

- Keep security warnings unambiguous.
- Preserve placeholders and interpolation keys.
- Check vanity generator labels, pause/resume states, heat warnings, and save actions across locales.
- Run locale audits when translation keys change.

---

## Vanity Generator Contributions

Vanity generation is CPU intensive and handles newly generated private keys. Contributions in this area must:

- Keep generated secrets hidden by default.
- Require explicit user action for reveal/copy.
- Avoid storing unnecessary secret data.
- Keep memory usage bounded.
- Include clear CPU, heat, and battery guidance for long-running scans.
- Avoid network calls, telemetry, or remote pattern submission.

---

## Release Notes

For release work:

- Update `package.json`, `package-lock.json`, and Android version metadata together.
- Update `README.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `ARCHITECTURE.md` when relevant.
- Keep older release details collapsed or summarized so the current release stays easy to read.
- Use `v*` git tags for GitHub Actions release builds.