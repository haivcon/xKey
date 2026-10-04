# Vanity security, ranking and wallet layout repair

## Summary / scope
Repair measured wallet rows, generated-secret copy policy, idle-lock bypass,
extra candidate deletion synchronization, filter minima and rarity-based scores.
No cryptographic algorithm replacement, settings reset, dependency or visual redesign.

## Existing implementation / source of truth
- WalletList owns virtual rows; TanStack owns measurement cache. Wallet IDs identify rows.
- dataSensitivity + secureCopy own classification, blocking and clipboard cleanup;
  useAutoLock owns lock events and user preferences.
- vanityMatch owns detection/ranking; vanityScoreGrade owns metadata and migration;
  storage owns encrypted wallet persistence. Generation workers own local candidate pools.
- Existing vanity, secret-detection and smoke tests are the regression entry points.

## Conflict / security review
Do not mutate security preferences. Remove periodic synthetic activity from scanning,
independent of the user's keep-awake option. Dispatch secret-copy events only on success.
Keep PIN, screenshot, encrypted session and backup flows intact. Wipe mutable random
key bytes for all outcomes; JS immutable strings cannot be guaranteed erased.
Send each newly accepted secret once, retaining only public ranking metadata in workers.

## UI / localization
Reuse existing card markup, themes, tokens, score grades and translated labels.
No new visible text. Existing scan notice is reviewed for continued accuracy.

## Scoring decision
Version 2: score = rounded 2.5 times constrained bits, conservatively accounting for
either-edge opportunities and free symbols in each pattern family. This is a ranking
heuristic, not an exact union probability or cryptographic key-strength score.
Explicit primary prefix/suffix score uses the number of unique constrained positions.
Per-rule minima remain authoritative; numeric legacy minima apply when no rules exist.
Existing primary highlights must not be overwritten by automatic extra inference.
Migrate encrypted stored scores through the existing metadata backfill path.

## Implementation / validation
Targeted edits followed by regression tests for classification, minima, rarity ordering,
primary overlap and migration. Browser coverage for visible rows without scrolling,
filter/load/unlock/resize/expand/reorder when feasible. Run npm test, lint, type-check,
build and relevant Playwright tests; report actual failures and platform limitations.

## Checklist
IMPLEMENTATION_CHECKLIST.md is absent. Use AI_CONTEXT / FEATURE_SPEC_TEMPLATE checks:
source ownership, no preference mutation, no new UI strings/styles, security regression,
small compatible changes, reviewed diff and actual validation exit codes.

## Review notes / limitations
- Random private-key bytes are wiped in `finally`, including address-derivation errors.
- Resume passes deleted-address exclusions into each new worker; incoming UI deltas
  also filter deleted addresses. Worker resume inputs contain public metadata only.
- Layout regression retains the focused WalletList harness and adds full-app generation/
  save of 10 wallets, real PIN setup, idle unlock and reload/unlock in light/dark themes.
- Clipboard E2E uses the actual generation hook and Capacitor web clipboard, rejecting
  both write attempts for failure coverage. It checks copy events, lock reasons and
  address-copy behavior, without logging secrets or enabling trace/video capture.
- Idle-lock E2E observes real worker progress, advances page timers in intervals (worker
  time remains real), and distinguishes no interaction from a real keyboard event.
- Test-only Preferences seeds apply once per isolated browser context, never to a
  device vault. Production defaults and security settings APIs remain unchanged.
- Android scope is read-only debug WebView attachment diagnostics plus a manual device
  checklist. No native security automation is claimed; no authorized device is attached.
  Biometric success/cancel/failure, credentials and screen-off behavior are UNVERIFIED.
- Immutable JavaScript secret strings cannot be reliably wiped. Scores represent
  pattern ranking, not cryptographic key strength or exact generation probability.

## Approved review follow-up
- Derive occurrence-qualified display IDs once per wallet list, sharing them across
  React, DnD and virtual rows. Tuple encoding avoids suffix/ID collisions. This does
  not migrate vault IDs; identical legacy entries still have occurrence-based identity.
- Memoize the row key callback and invalidate measurements on density/scale changes.
- Classify actual `vanity-found-*` copy fields as public addresses; test the policy.
- Extend the existing light/dark layout harness with duplicate/missing IDs and theme
  settings changes. No new dependencies, UI strings, styles or security mutations.
- Preserve legacy primary scores when metadata cannot safely infer v2. Mixed old/new
  scores may therefore remain in sorting; unmatched addresses may be rescanned on load.
  Recalibration of grade thresholds and a broader data migration are out of scope.
- Keep unused locale keys for compatibility; only remove verified whitespace defects.

## Follow-up validation
- Full `npm test`, type-check, lint and build completed with exit 0.
- Final full Playwright run: 49 passed, exit 0, one worker, trace disabled.
  Logs and final artifacts are outside the repository under the system temp folder.
- First E2E run: 47 passed, two harness failures from the pre-existing navigation CSP
  meta warning. Console capture now starts after navigation and before harness mount,
  retaining duplicate-key error detection. The first output argument was malformed;
  the final run corrected it and explicitly placed artifacts outside the workspace.
- Extended layout coverage includes repeated addresses without IDs, repeated IDs,
  missing addresses, filtering/reversal, density/scale changes and both themes.
  Actual pointer-drag interactions and 10,000-wallet performance are not benchmarked.
- Android native security remains UNVERIFIED. No commit/push or security settings changes.

## Prior recorded validation (not evidence of the follow-up run)
- `npm test`: exit 0, including vanity, scoring, secret classification and security suites.
- `npm run lint`, `npm run type-check`, `npm run build`: exit 0. Final lint rerun passed.
- `npm run locale:audit`: exit 0; 15 locales, 5,003 existing translation-quality warnings.
- `npx playwright test --workers=1 --reporter=line`: 49 passed, exit 0 (3.0 minutes).
  Includes all nine new/extended security/layout cases and the existing real worker tests.
- `node --check tests/android-webview-check.mjs`: exit 0. Device diagnostic returned
  UNVERIFIED (no attached device); Android native behavior remains a manual gate.
- Earlier E2E attempts failed during selector development, Vite reloads, concurrent
  runners sharing a server, and parallel worker load. Do not treat those as passes.
  Final full-suite validation ran alone, with logs outside the Vite workspace.
- No synthetic-activity mutation test was performed. Browser coverage copies generated
  mnemonics; private-key field classification is unit-tested, but native copy and biometric
  outcomes are not automated here. Default-parallel full-suite stability is not claimed.
- Checklist review: source ownership retained; no production preference writes/default
  changes; existing locale keys reused; no new styling; both themes exercised; no commit,
  push, release or dependency changes. IMPLEMENTATION_CHECKLIST.md remains absent.
