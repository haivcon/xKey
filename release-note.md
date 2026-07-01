✨ Improved vanity wallet highlighting for primary and extra matches.
🏠 Saved vanity wallets now keep highlight metadata for accurate home screen display.
🧩 Reused one highlight-length helper to prevent head/tail overlap in compact addresses.
✅ Added regression coverage for main, extra, head, tail, and both-side vanity patterns.
🛠 Verified with vanity tests, type-check, and lint.
🔎 Added extra vanity filters for numeric tails and low-diversity edge patterns, updated localized labels, fixed duplicated/escaped locale entries, and verified with build plus vanity-related tests.
🔐 Added encrypted vault snapshots before import, merge, batch delete, and schema migration. Local rollback can restore the latest snapshot after risky changes, and migrations now support dry-run reporting before apply.
🔔 Standardized top toast notifications with shared design tokens, severity variants, responsive typography, and i18n-safe helpers. Added HODL text for the reveal hint across all locales and verified the production build.