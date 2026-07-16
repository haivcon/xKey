# xKey 6.0.29 Audit Remediation Spec

## 1. Tóm tắt

**Tên thay đổi:** Hoàn tất remediation cho audit bảo mật, độ bền dữ liệu, import, i18n, test và Android.

**Vấn đề cần giải quyết:** Các finding P0/P1 ban đầu đã được harden, nhưng vault/setting vẫn dùng CryptoJS passphrase AES không có authentication tag; import timeout chưa hủy công việc; security config import chưa có transaction ứng dụng; locale/smoke/native tests còn thiếu.

**Kết quả mong muốn:**

- Mọi dữ liệu vault ghi mới dùng versioned AES-256-GCM.
- Dữ liệu legacy vẫn đọc và migrate an toàn.
- Không báo mutation thành công trước persistence commit.
- Import có byte/schema limit, cancellation và stale-result guard.
- Security setting import validate, readback và rollback được.
- Locale audit, smoke test, web build và Android test pass.
- Không làm yếu PIN, biometric, auto-lock, clipboard, screenshot protection hoặc backup protection.

**Phạm vi:**

- Wallet vault, HD roots, field encryption và encrypted Preferences.
- Crypto worker lifecycle.
- Import worker/validation.
- Security settings persistence.
- Locale completeness/quality và hardcoded duration labels.
- Playwright regressions.
- Android app-owned tests/deprecations và hardware-bound UX.

**Ngoài phạm vi:**

- Thay đổi blockchain/key derivation.
- Thay đổi format private key/mnemonic.
- Rewrite toàn bộ UI hoặc module lớn.
- Patch trực tiếp dependency/AGP/Capacitor trong `node_modules`.
- Tự động dịch locale bằng English fallback.

## 2. Khám phá code hiện có

### Component

- `src/components/auth/PinLockScreen.tsx`
- `src/components/settings/security/SecurityTabContent.tsx`
- `src/components/settings/DataTab.tsx`
- `src/components/AdvancedToolsModal.tsx`
- `src/components/BackupImportPasswordModal.tsx`

### Hook

- `src/hooks/useWallets.ts`
- `src/hooks/useFileImport.ts`
- `src/hooks/security/useAutoLock.ts`
- `src/hooks/backup/useAutoBackup.ts`
- `src/hooks/backup/useBackupExport.ts`

### Utility/worker

- `src/utils/storage.ts`
- `src/workers/crypto.worker.ts`
- `src/utils/crypto/cryptoEnvelope.ts`
- `src/utils/backup/backupCrypto.ts`
- `src/utils/vaultSnapshot.ts`
- `src/utils/importFileLimits.ts`
- `src/utils/asyncTimeout.ts`
- `src/utils/clipboard.ts`
- `src/features/security/pinCredential.ts`
- `src/features/security/sensitivePin.ts`

### Settings/storage

- Capacitor Preferences là source hiện tại cho setting.
- Native filesystem/Preferences là source hiện tại cho encrypted vault.
- `saveWallets`, `loadWallets`, crypto worker và vault snapshot là persistence boundary.
- `SecurityTabContent` hiện vẫn ghi một số security setting trực tiếp.

### Locale

- `src/locales/en.ts` là key-shape source.
- `scripts/locale-audit.mjs` là completeness check.
- Không dùng `scripts/sync-locales.mjs` để remediation vì script rewrite file và chèn English fallback.

### Tests

- `tests/*.test.mjs`
- `tests/smoke/*.spec.js`
- Android `app/src/test`
- CI `.github/workflows/ci.yml`

## 3. Source of truth

- Vault ciphertext: storage API trong `src/utils/storage.ts`.
- Crypto format mới: một utility envelope nội bộ duy nhất, được worker và encrypted-setting API tái sử dụng.
- PIN credential: `src/features/security/pinCredential.ts`.
- Auto-lock: constants/API security setting hiện có; không tạo setting song song.
- Import limits: mở rộng `src/utils/importFileLimits.ts`, không tạo magic limit ở component.
- Locale key shape: `en.ts`.
- Security config import: service domain mới sẽ trở thành persistence boundary; component chỉ quản lý transient UI state.

Không tạo duplicate persistent state. Legacy decrypt chỉ là compatibility path và không được dùng để ghi mới.

## 4. Kiểm tra xung đột

- [x] Không duplicate feature hiện có.
- [x] Không override user setting.
- [x] Không làm yếu bảo mật.
- [x] Không bypass i18n.
- [x] Không tạo UI pattern one-off.
- [x] Không thay behavior ngoài phạm vi.

Rủi ro chính:

1. Crypto migration làm mất dữ liệu.
   - Giảm thiểu bằng legacy-read, snapshot, write/readback verify, atomic replacement và test failure injection.
2. Async API setting làm stale state.
   - Chuyển call-site theo từng domain và chỉ commit UI sau persistence.
3. Worker timeout để lại side effect.
   - Dùng request map, generation ID, terminate/restart và cleanup.
4. Locale patch làm mất bản dịch.
   - Targeted patch, không stringify/rewrite toàn file.
5. Android warning thuộc dependency.
   - Chỉ sửa app-owned DSL/API; ghi nhận phần dependency.

## 5. Bảo mật và quyền riêng tư

Có chạm:

- [x] Private key
- [x] Mnemonic
- [x] Backup/import/export
- [x] Clipboard
- [x] PIN/biometric
- [x] Auto-lock

Cam kết:

- Không log plaintext, key, PIN, mnemonic, backup payload hoặc ciphertext đầy đủ.
- Không đặt auto-lock thành `0`, không tắt auto-lock ngoài security API.
- Không tắt screenshot protection.
- Không bypass clipboard cleanup/copy policy.
- Hardware-bound-only chỉ xóa fallback sau wrapped-key readback thành công.
- AES-GCM marker bị hỏng phải fail, không trả ciphertext như plaintext.

## 6. UI và design system

- Tái sử dụng `Notice`, settings row/card, modal, button và token hiện tại.
- Chỉ thêm UI khi cần mô tả hardware-bound state hoặc lỗi import cụ thể.
- Mọi UI mới dùng semantic theme classes, hoạt động light/dark và responsive.
- Không thêm font/color/radius one-off.

## 7. Localization

Namespace dự kiến:

- `common`
- `settings`
- `fileStatus`
- `createWallet`
- `actionBar`
- `qrReceive`
- `pinLock`

Key mới chỉ được thêm nếu không có key semantic hiện tại. Mọi locale phải có bản dịch riêng; placeholder phải khớp `en`.

## 8. Kế hoạch triển khai

1. Thêm regression tests cho PIN credential, backup descriptor và import limits.
2. Tạo raw-key AES-GCM envelope có context/AAD và tests.
3. Migrate worker outer vault, HD roots và sensitive fields với legacy-read/V2-write.
4. Sửa worker request lifecycle: timeout/error/messageerror/pending cleanup/restart.
5. Chuyển encrypted settings sang async V2 API, giữ legacy/plaintext compatibility có phân loại rõ.
6. Thêm schema limits và cancellable import worker/stale-operation guard.
7. Tách security setting services và triển khai config import snapshot/apply/readback/rollback.
8. Hoàn tất locale/hardcoded duration/native prompt và quality report.
9. Sửa smoke functional/layout và tạo baseline đúng platform nếu cần.
10. Thêm Android tests và sửa deprecation app-owned.
11. Làm rõ compatibility/hardware-protected/hardware-bound-only UX.
12. Chạy toàn bộ verification matrix.

## 9. Kế hoạch test

- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run locale:audit`
- `npm run test:smoke`
- `npm run build`
- `npm audit --omit=dev --audit-level=high`
- `android\gradlew.bat -p android testDebugUnitTest --warning-mode all`
- `git diff --check`
- `git status --short`

Crypto tests:

- Round-trip, random IV, tamper, wrong key/context/version/truncation.
- Legacy read và V2 rewrite.
- Main/decoy/domain separation.
- Failure trước/trong/sau write không mất bản cũ.
- Marker mới hỏng không fallback plaintext.

Persistence tests:

- State/toast/audit chỉ sau commit.
- Snapshot giữ lại khi write reject.
- Save queue phục hồi sau rejection.

Import tests:

- Byte/schema boundary.
- Timeout/cancel terminate worker.
- Stale result không cập nhật state.

## 10. Quyết định

- Dùng WebCrypto AES-GCM và raw 32-byte vault key; không dùng PBKDF2 cho mỗi lần save vì vault key đã có entropy.
- Portable backup tiếp tục dùng PBKDF2 riêng.
- Không đổi format cũ tại chỗ trước khi readback V2 thành công.
- Không bật locale audit trong CI cho đến khi local pass.
- Không cập nhật visual snapshot để che functional/layout failure.
- Refactor tăng dần sau khi behavior có regression tests.