# Lộ trình Chuyển đổi TypeScript (TypeScript Migration Roadmap)

Tài liệu này cung cấp hướng dẫn chi tiết từng bước (step-by-step) để chuyển đổi dự án **xKey** từ JavaScript (JS) sang TypeScript (TS) một cách an toàn, không làm gián đoạn các tính năng mã hóa lõi và không gây rủi ro mất dữ liệu của người dùng.

---

## 🎯 Mục tiêu & Chiến lược

- **Chiến lược:** Chuyển đổi tăng dần (Incremental Migration). Chúng ta không đập đi xây lại toàn bộ cùng một lúc.
- **Hướng tiếp cận:** Bottom-Up (Từ dưới lên). Bắt đầu từ việc cấu hình hệ thống -> Các file tiện ích (Utils) -> State Management (Contexts/Hooks) -> Giao diện (Components).
- **Trạng thái hiện tại:** Dự án đã có sẵn file `src/types.ts` chứa một số interface cơ bản (như `Wallet`, `QrModalData`). Đây là bước đà rất tốt.

### Trạng thái triển khai hiện tại

- Toàn bộ file nguồn trong `src/` đã được đổi sang `.ts` hoặc `.tsx`.
- `vite.config.js` đã được đổi sang `vite.config.ts`.
- `index.html` đã trỏ sang `src/main.tsx`.
- `tsconfig.json` đã bật `strict: true` và tắt `allowJs` cho source TypeScript.
- Đã thêm script `npm run type-check` và TypeScript-aware ESLint.
- Các test Node cho Shamir/Reed-Solomon chạy qua `tsx` để import trực tiếp source TypeScript.
- Không còn file nào trong `src/` dùng `// @ts-nocheck`; toàn bộ source TypeScript hiện được `tsc --noEmit` kiểm tra trực tiếp.
- Đã gỡ `@ts-nocheck` và thêm type thật cho nhóm ít rủi ro/khép kín:
  - `src/utils/amountFormat.ts`
  - `src/utils/actionHistory.ts`
  - `src/utils/clipboard.ts`
  - `src/utils/haptics.ts`
  - `src/utils/nativeFileOpen.ts`
  - `src/utils/deviceIntegrity.ts`
  - `src/utils/screenSecurity.ts`
  - `src/utils/deviceCredential.ts`
  - `src/utils/auditLog.ts`
  - `src/utils/migration.ts`
  - `src/utils/cryptoEnvelope.ts`
  - `src/utils/reedSolomon.ts`
  - `src/utils/shamir.ts`
  - `src/utils/runtimeIntegrity.ts`
  - `src/utils/storage.ts`
  - `src/utils/backupUtils.ts`
  - `src/hooks/useAppVersion.ts`
  - `src/hooks/useAutoLock.ts`
  - `src/hooks/useAutoBackup.ts`
  - `src/hooks/useBackButton.ts`
  - `src/hooks/useBatchSelect.ts`
  - `src/hooks/useFileImport.ts`
  - `src/hooks/useLazyList.ts`
  - `src/hooks/useLiteMode.ts`
  - `src/hooks/useReauth.ts`
  - `src/hooks/useShakeToLock.ts`
  - `src/hooks/useWallets.ts`
  - `src/contexts/ConfirmContext.tsx`
  - `src/contexts/LanguageContext.tsx`
  - `src/contexts/MasterPasswordContext.tsx`
  - `src/contexts/ScrambledKeyboardContext.tsx`
  - `src/contexts/ScreenSecurityContext.tsx`
  - `src/contexts/SecureDisplayContext.tsx`
  - `src/contexts/ThemeContext.tsx`
  - `src/contexts/ToastContext.tsx`
  - `src/App.tsx`
  - `src/main.tsx`
  - `src/components/AnimatedSplash.tsx`
  - `src/components/AuthErrorScreen.tsx`
  - `src/components/BatchActionBar.tsx`
  - `src/components/BulkNetworkModal.tsx`
  - `src/components/DeviceUnlockScreen.tsx`
  - `src/components/DonateModal.tsx`
  - `src/components/ActionBar.tsx`
  - `src/components/DuplicateDetector.tsx`
  - `src/components/ExportCSVModal.tsx`
  - `src/components/ErrorBoundary.tsx`
  - `src/components/FolderTabs.tsx`
  - `src/components/DashboardView.tsx`
  - `src/components/HDWalletTreeVisualizer.tsx`
  - `src/components/MarkdownRenderer.tsx`
  - `src/components/MoveToFolderModal.tsx`
  - `src/components/Notice.tsx`
  - `src/components/PasswordInput.tsx`
  - `src/components/QRCodeModal.tsx`
  - `src/components/QRReceiveModal.tsx`
  - `src/components/QRScannerModal.tsx`
  - `src/components/QRTransferModal.tsx`
  - `src/components/AdvancedToolsModal.tsx`
  - `src/components/AssetBalanceModal.tsx`
  - `src/components/CreateWalletModal.tsx`
  - `src/components/PinLockScreen.tsx`
  - `src/components/SettingsScreen.tsx`
  - `src/components/ShamirBackupModal.tsx`
  - `src/components/ShamirRestoreModal.tsx`
  - `src/components/SortableWalletCard.tsx`
  - `src/components/WalletCard.tsx`
  - `src/components/WalletList.tsx`
  - `src/components/settings/AuditLogTab.tsx`
  - `src/components/settings/DangerZone.tsx`
  - `src/components/settings/DataTab.tsx`
  - `src/components/settings/GeneralTab.tsx`
  - `src/components/settings/InfoTab.tsx`
  - `src/components/settings/SecurityTab.tsx`
  - `src/components/SecureGlyphText.tsx`
  - `src/components/SecureTextarea.tsx`
  - `src/components/SkeletonCard.tsx`
  - `src/components/TagSystem.tsx`
  - `src/locales/index.ts`
  - `src/locales/*.ts`
  - `src/workers/crypto.worker.ts`
  - `src/workers/vanityWorker.ts`

Các kiểm tra đã chạy sau migration:

```bash
npm run type-check
npm run lin
npm run test:shamir
npm run test:reed-solomon
npm run test:smoke
npm run build
npx cap sync android
android/gradlew -p android assembleDebug
```

---

## 📦 Giai đoạn 1: Chuẩn bị Môi trường (Environment Setup)
*Ước tính thời gian: 1 ngày*

Trước khi đổi đuôi file, hệ thống cần được cấu hình để hiểu và kiểm tra lỗi TypeScript một cách khắt khe nhất (Strict Mode).

1. **Cài đặt thư viện Type:**
   ```bash
   npm install --save-dev typescript @types/react @types/react-dom @types/node
   ```
2. **Cập nhật `tsconfig.json`:**
   Đảm bảo bật tính năng `allowJs` (cho phép file JS và TS chạy song song) và dần dần chuyển sang `strict: true`.
   ```json
   {
     "compilerOptions": {
       "target": "ESNext",
       "useDefineForClassFields": true,
       "lib": ["DOM", "DOM.Iterable", "ESNext"],
       "allowJs": true,
       "skipLibCheck": true,
       "esModuleInterop": false,
       "allowSyntheticDefaultImports": true,
       "strict": true, // Bật kiểm tra khắt khe
       "forceConsistentCasingInFileNames": true,
       "module": "ESNext",
       "moduleResolution": "Node",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx"
     },
     "include": ["src"]
   }
   ```
3. **Cập nhật Linter (`eslint.config.js`):** Thêm plugin `@typescript-eslint/eslint-plugin` để bắt lỗi code TS.

---

## 🛠 Giai đoạn 2: Lõi Mã hóa & Tiện ích (Core Utils & Security)
*Ước tính thời gian: 1-2 tuần*

Đây là phần quan trọng nhất. Phải chuyển đổi các file trong `src/utils/` từ `.js` sang `.ts`. Mọi cấu trúc dữ liệu truyền vào các hàm mã hóa cần được định nghĩa rõ ràng.

### Danh sách các file cần chuyển đổi theo thứ tự ưu tiên:

**Nhóm 1: Cryptography & Storage (Rủi ro cao nhất - Cần làm cẩn thận)**
- [x] `src/utils/cryptoEnvelope.js` ➔ `.ts`
  - *Việc cần làm:* Định nghĩa Interface cho `CryptoEnvelope` (format, version, kdf, cipher, payload). Rõ ràng hóa kiểu dữ liệu đầu vào của hàm mã hóa (Uint8Array vs string).
- [x] `src/utils/storage.js` ➔ `.ts`
  - *Việc cần làm:* Định nghĩa kiểu trả về của các hàm tương tác với `Capacitor Preferences`.
- [x] `src/utils/reedSolomon.js` ➔ `.ts`
  - *Việc cần làm:* Type rõ ràng cho các mảng byte (Uint8Array) của các data shards và parity shards.
- [x] `src/utils/shamir.js` ➔ `.ts`

**Nhóm 2: Security & Device Integrity**
- [x] `src/utils/deviceCredential.js` ➔ `.ts`
- [x] `src/utils/deviceIntegrity.js` ➔ `.ts`
- [x] `src/utils/runtimeIntegrity.js` ➔ `.ts`
- [x] `src/utils/screenSecurity.js` ➔ `.ts`

**Nhóm 3: Logic Dữ liệu & Backup**
- [x] `src/utils/backupUtils.js` ➔ `.ts`
  - *Việc cần làm:* Định nghĩa Interface cho `BackupContainer` (header, payload, recovery footer).
- [x] `src/utils/auditLog.js` ➔ `.ts`
  - *Việc cần làm:* Tạo `type AuditEvent = 'app_open' | 'backup_import' | ...` thay vì dùng string tự do.
- [x] `src/utils/migration.js` ➔ `.ts`

**Nhóm 4: UI Utils**
- [x] `src/utils/amountFormat.js` ➔ `.ts`
- [x] `src/utils/clipboard.js` ➔ `.ts`
- [x] `src/utils/haptics.js` ➔ `.ts`
- [x] `src/utils/nativeFileOpen.js` ➔ `.ts`
- [x] `src/utils/actionHistory.js` ➔ `.ts`

*Chú ý:* Trong giai đoạn này, hãy mở rộng file `src/types.ts` hoặc tách nó thành thư mục `src/types/` (ví dụ: `crypto.types.ts`, `backup.types.ts`).

---

## 🔄 Giai đoạn 3: State Management (Hooks & Contexts)
*Ước tính thời gian: 3-5 ngày*

Sau khi các hàm Utils đã trả về đúng kiểu dữ liệu, chúng ta tiến hành gắn Type vào tầng quản lý State.

- [x] `src/contexts/` (Chuyển sang `.tsx`)
  - Định nghĩa Type cho các biến State trong Context (ví dụ: `VaultContextType`, `SettingsContextType`).
  - Gắn kiểu dữ liệu cho các `dispatch` và `action` của Reducer (nếu có).
- [x] `src/hooks/` (Chuyển sang `.ts`)
  - Gắn Type cho tham số đầu vào và kiểu dữ liệu trả về của custom hooks.

---

## 🎨 Giai đoạn 4: UI Components & App Core
*Ước tính thời gian: 1-2 tuần*

Chuyển đổi toàn bộ giao diện từ `.jsx` sang `.tsx`.

1. **Thư mục `src/components/`**
   - Với mỗi component, tạo một `interface Props { ... }` để định nghĩa rõ Component đó nhận vào các Props gì.
   - Ví dụ:
     ```tsx
     interface QRScannerModalProps {
       isOpen: boolean;
       onScan: (data: string) => void;
       onClose: () => void;
     }
     export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onScan, onClose }) => { ... }
     ```
   - Chuyển đổi dần dần từ các UI nhỏ (Buttons, Inputs, Cards) lên đến các Page lớn.

2. **Core App Files:**
  - [x] `src/App.jsx` ➔ `App.tsx`
  - [x] `src/main.jsx` ➔ `main.tsx`

---

## 🚀 Giai đoạn 5: Tối ưu hóa & Đóng băng (Strict Enforcement)
*Ước tính thời gian: 2 ngày*

Sau khi 100% file đã chuyển sang `.ts` và `.tsx`:

1. **Khóa `allowJs`:** Mở `tsconfig.json` và chuyển `"allowJs": false`. Từ nay dự án sẽ cấm hoàn toàn việc viết file JavaScript thuần.
2. **Khắc phục các lỗi `any`:** Tìm và thay thế các từ khóa `any` bằng kiểu dữ liệu chính xác hoặc `unknown`.
3. **Cập nhật CI/CD:** Thêm lệnh `npm run type-check` (chạy `tsc --noEmit`) vào GitHub Actions để đảm bảo không ai có thể push code lên nếu code bị lỗi Type.

---

## 💡 Tổng kết Lợi ích sau khi chuyển đổi
- Tự động bắt lỗi sai tham số mã hóa trước khi chạy thử ứng dụng.
- Dễ dàng refactor (sửa đổi) tính năng Backup hay Tự chữa lành mà không sợ phá vỡ logic cũ.
- Tăng độ uy tín với các Auditor bảo mật (Security Auditors) và những người đóng góp (Contributors) nhờ cấu trúc code rõ ràng, minh bạch.
