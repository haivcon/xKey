# Báo cáo rà soát dự án xKey

Ngày rà soát: 2026-06-16
Phiên bản hiện tại: 5.7.0
Phạm vi: mã nguồn React/Vite, Capacitor Android, lưu trữ, bảo mật, giao diện, đa ngôn ngữ, build và định hướng sản phẩm.

## 1. Công dụng của dự án

xKey là ứng dụng quản lý kho ví Web3 theo hướng offline-first. Ứng dụng cho phép người dùng lưu địa chỉ ví, private key, seed phrase, ghi chú, nhãn, thư mục, mã QR, bản sao lưu `.xkey`, dữ liệu CSV và số dư tài sản ngay trên thiết bị.

Mục tiêu cốt lõi của xKey là trở thành một “kho khóa cá nhân” dùng cục bộ, không phải ví giao dịch online. Người dùng có thể dùng xKey để:

- Quản lý nhiều ví Web3 trong một kho mã hóa.
- Lưu private key và seed phrase ở dạng mã hóa cục bộ.
- Tạo ví mới, nhập ví thủ công, tạo ví đẹp theo tiền tố/hậu tố.
- Chia nhóm ví theo thư mục, nhãn, mạng, trạng thái ghim hoặc số dư.
- Sao lưu/khôi phục bằng file `.xkey` có mật khẩu.
- Xuất CSV khi cần kiểm kê hoặc đối chiếu.
- Quét, hiển thị, chia sẻ và tải QR cho địa chỉ hoặc dữ liệu ví.
- Theo dõi số dư thủ công theo đơn vị tùy chọn như `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, điểm hoặc nhãn tự nhập.
- Dùng Android Device Credential để mở kho bằng vân tay, khuôn mặt, PIN, mật khẩu hoặc mẫu hình của thiết bị.

## 2. Ưu điểm hiện tại

### Bảo mật và lưu trữ

- Dữ liệu ví được mã hóa cục bộ, phù hợp với mục tiêu offline vault.
- Sensitive fields như private key và seed phrase được mã hóa thêm ở cấp field trước khi mã hóa toàn bộ danh sách ví.
- Android native đã có plugin Device Credential riêng, dùng Android Keystore để wrap khóa kho.
- `android:allowBackup="false"` đã được đặt trong AndroidManifest, giảm nguy cơ dữ liệu app bị backup ngoài ý muốn.
- Có cơ chế tự khóa khi không thao tác, tự xóa clipboard, privacy shield khi app inactive, master password khi xem dữ liệu nhạy cảm.
- Có wipe/reset khi vault bị lỗi nghiêm trọng.

### Trải nghiệm người dùng

- Trang chủ đã hỗ trợ layout responsive, danh sách ví nhiều cột trên màn hình rộng và tối ưu cho mobile.
- Có tùy chỉnh tỷ lệ hiển thị từ 5% đến 200%, phù hợp thiết bị nhỏ hoặc người dùng muốn xem nhiều dữ liệu.
- Có chế độ dense/compact/ultra compact cho danh sách ví.
- Nút copy, QR, mở rộng ví, thêm ví, công cụ, tìm kiếm, lọc, sắp xếp đã được đưa gần workflow thực tế.
- Có thư mục ví đẹp, nhãn NEW, vòng sáng cho ví mới tạo, và tự chuyển về thư mục chứa ví mới.
- Modal sửa số dư đã có tìm kiếm, paste, copy địa chỉ, import CSV, filter và tự lưu nháp.
- Toast/confirm đã được làm lại chuyên nghiệp hơn và có xu hướng scale theo tỷ lệ hiển thị.

### Tính năng

- Tạo ví thường, nhập thủ công, tạo ví đẹp bằng worker riêng.
- Backup `.xkey`, import/export CSV, duplicate detector, analytics, advanced tools.
- QR transfer có mật khẩu, QR scanner, QR share/download.
- Hỗ trợ nhiều mạng phổ biến: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Có multi-language với 15 ngôn ngữ.
- Version được lấy từ `package.json`/native app info và hiển thị trong app.

### Build và Android

- `npm run lint` đã chạy thành công.
- `npm run build` đã chạy thành công.
- `npx cap sync android` đã đồng bộ web assets sang Android.
- Android version hiện là `versionName "5.7.0"` và `versionCode 57`.
- `.gitignore` đã loại trừ `1/`, build artifacts, signing secrets, `.xkey`, APK/AAB và file local.

## 3. Nhược điểm và lỗi tiềm ẩn

### Mức cao

1. Phụ thuộc có cảnh báo bảo mật từ `npm audit`.

   Kết quả `npm audit --omit=dev` báo:

   - `vite 8.0.0 - 8.0.15`: high severity, liên quan Windows path/UNC trong dev server.
   - `ws` qua `ethers`: high/moderate severity. `npm audit fix --force` đề xuất hạ `ethers` xuống major 5, có thể gây breaking change.

   Đề xuất: cập nhật Vite trong phạm vi patch/minor an toàn trước. Với `ethers/ws`, cần kiểm tra bản `ethers` mới hơn hoặc override `ws` nếu upstream đã hỗ trợ, không nên dùng `--force` mù.

2. Release Android chưa bật shrink/minify.

   `android/app/build.gradle` đang để `release { minifyEnabled false }`. Điều này không làm app lỗi, nhưng APK/AAB dễ bị reverse engineering hơn và dung lượng lớn hơn.

   Đề xuất: thử bật R8/ProGuard cho release, thêm keep rules cho Capacitor/plugin nếu cần, test kỹ trước khi phát hành.

3. Fallback AES key vẫn được lưu trong Preferences.

   Code hiện lưu `xkey_aes_fallback` để phục hồi hoặc tương thích web/fallback. Đây là tradeoff giúp giảm nguy cơ mất vault khi đổi khóa thiết bị, nhưng về bảo mật native Android thì vẫn yếu hơn mô hình chỉ giữ key trong Keystore.

   Đề xuất: tách rõ hai chế độ:

   - Android Secure Mode: key chỉ unwrap qua Keystore/device credential.
   - Compatibility Mode: giữ fallback key, hiển thị cảnh báo rõ cho người dùng.

4. Một số bản dịch phụ còn sót tiếng Anh.

   Kiểm tra tự động cho thấy nhiều locale như `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` vẫn còn chuỗi như `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Đề xuất: tạo script i18n check trong CI để fail build khi locale thiếu key hoặc còn raw key quan trọng.

### Mức trung bình

1. Locale thiếu key ở nhiều ngôn ngữ.

   So với `en.js`, hầu hết locale ngoài `vi` đang thiếu:

   - `common.warning`
   - `createWallet.vanityLongTitle`

   Vì `LanguageContext` fallback sang tiếng Anh, app không crash, nhưng trải nghiệm đa ngôn ngữ chưa hoàn chỉnh.

2. `chainBulk` đang là extra key ở nhiều locale.

   Nhiều locale có nhóm `chainBulk.*` nhưng `en.js` không có. Đây có thể là key cũ hoặc key chưa đồng bộ. Không gây lỗi trực tiếp, nhưng làm bộ dịch khó kiểm soát.

3. CryptoJS AES passphrase mode chưa phải mô hình mã hóa hiện đại nhất.

   `CryptoJS.AES.encrypt(data, key)` hoạt động, nhưng không rõ ràng bằng mô hình chuẩn có salt/KDF/IV/auth tag riêng. AES-GCM hoặc WebCrypto sẽ dễ audit hơn.

   Đề xuất dài hạn: migrate vault format sang WebCrypto AES-GCM, PBKDF2/Argon2id rõ tham số, versioned payload, authentication tag bắt buộc.

4. Master password dùng PBKDF2 10.000 iterations.

   Mức này hơi thấp so với kỳ vọng hiện nay nếu dùng để bảo vệ dữ liệu nhạy cảm. Đây là password phụ để xem private key/seed, không phải khóa chính vault, nhưng vẫn nên nâng.

   Đề xuất: tăng iterations theo benchmark thiết bị, lưu version hash để migration không phá dữ liệu cũ.

5. Clipboard auto-clear không bảo đảm tuyệt đối trên mọi nền tảng.

   Code đã kiểm tra clipboard vẫn giữ đúng giá trị trước khi xóa, đây là hướng tốt. Nhưng Android/browser có thể giới hạn clipboard write khi không phải user gesture.

   Đề xuất: trong UI mô tả rõ “xKey sẽ cố gắng xóa clipboard nếu hệ điều hành cho phép”, không hứa tuyệt đối.

6. Không có test tự động thực tế.

   Dự án có lint/build nhưng chưa thấy test unit/e2e cho các luồng quan trọng như unlock, import/export, tạo ví đẹp, sửa số dư, clipboard, i18n.

   Đề xuất: thêm smoke tests bằng Playwright cho web và một checklist Android instrumentation/manual release.

### Mức thấp

1. Còn `console.error` ở vài nơi.

   Không nghiêm trọng, nhưng nên gom về logger/dev-only để tránh lộ stack không cần thiết trong production.

2. Vite báo warning chunk lớn.

   Chunk `index` và `scan` lớn. Không phải lỗi runtime, nhưng có thể làm mở app chậm hơn trên máy yếu.

   Đề xuất: lazy load QR scanner, ethers-heavy paths, advanced tools và dashboard sâu hơn.

3. Một số UI vẫn có nguy cơ lệch khi scale rất thấp hoặc rất cao.

   App đã scale nhiều phần, nhưng các modal lớn, QR, toast, form dày, bottom sheet và wallet card vẫn cần test ở 5%, 50%, 75%, 100%, 150%, 200%.

## 4. Đánh giá theo nhóm chức năng

### Bảo mật mở khóa

Hướng Android Device Credential là đúng vì để hệ điều hành xử lý biometric và fallback PIN/mật khẩu/mẫu hình. Rủi ro chính nằm ở migration giữa cơ chế PIN cũ, fallback key và Keystore key.

Khuyến nghị:

- Có màn hình “Trạng thái bảo mật vault”: Android Secure, Web Fallback, Compatibility, cần thiết lập khóa thiết bị.
- Khi phát hiện key bị invalidated, không tự tạo vault key mới nếu vault cũ còn ciphertext; chỉ hướng dẫn người dùng recovery/wipe.
- Ghi log trạng thái unlock nội bộ, không ghi dữ liệu nhạy cảm.

### Tạo ví đẹp

Worker riêng là đúng vì tránh treo UI. Các nâng cấp gần đây như số lượng ví, tự lưu vào thư mục, tạm dừng auto-lock khi generator chạy, thời gian giới hạn và cảnh báo mẫu dài đều hợp lý.

Khuyến nghị:

- Hiển thị xác suất/ước lượng thời gian rõ theo độ dài mẫu.
- Cho phép dừng/tạm dừng/tiếp tục job.
- Lưu lịch sử job đã tạo để người dùng biết ví nào từ batch nào.
- Cảnh báo mạnh khi mẫu quá dài trên mobile.

### Sửa số dư tài sản

Workflow hiện phù hợp với người dùng đối chiếu địa chỉ trên blockchain rồi nhập số dư thủ công. Điểm mạnh là có tìm kiếm, copy địa chỉ, paste, filter, CSV và autosave draft.

Khuyến nghị:

- Thêm chế độ “đối chiếu từng ví”: màn hình chỉ hiện 1 ví, địa chỉ full, copy, link explorer theo network và ô nhập lớn.
- Cho phép đánh dấu “đã kiểm tra” để tránh nhập sót.
- Cho phép import CSV theo cột `address,balance,unit,network`.
- Thêm undo cho lần sửa gần nhất.

### Đa ngôn ngữ

Fallback sang tiếng Anh giúp app không vỡ giao diện, nhưng sản phẩm hướng đa quốc gia cần kiểm soát dịch chặt hơn.

Khuyến nghị:

- Tạo script `npm run i18n:check`.
- Báo thiếu key, extra key, raw translation key trong UI.
- Ưu tiên dịch chính xác nhóm bảo mật, backup, wipe, private key, seed phrase.

### Android release

Cấu hình hiện đủ để build và sync, nhưng release hardening còn thiếu.

Khuyến nghị:

- Bật minify cho release sau khi test.
- Thêm CI bước `npm audit --omit=dev` với allowlist rõ.
- Build APK/AAB bằng GitHub Actions theo tag.
- Lưu release notes theo phiên bản trong repo.

## 5. Ý tưởng nâng cấp đề xuấ

### Ngắn hạn

- Sửa toàn bộ key dịch còn thiếu: `common.warning`, `createWallet.vanityLongTitle`.
- Dọn các chuỗi tiếng Anh còn sót trong locale khác.
- Thêm script kiểm tra i18n vào CI.
- Cập nhật Vite để xử lý advisory hiện tại.
- Thêm trang “Security Status” trong cài đặt.
- Bổ sung chú thích rõ cho clipboard auto-clear là best-effort.
- Thêm nút “mở explorer” theo network trong modal sửa số dư.
- Thêm undo snackbar cho xóa ví, sửa số dư, đổi thư mục.

### Trung hạn

- Chuyển encryption format sang versioned WebCrypto AES-GCM.
- Tách Android Secure Mode và Compatibility Mode.
- Thêm Playwright smoke test cho các luồng chính.
- Lazy load scanner/analytics/advanced tools để giảm bundle đầu vào.
- Thêm export/import settings không chứa dữ liệu nhạy cảm.
- Thêm chế độ “Audit vault”: ví thiếu backup, trùng địa chỉ, thiếu network, thiếu tên, private key không khớp address.

### Dài hạn

- Xây dựng recovery guide chính thức cho trường hợp đổi máy, đổi khóa màn hình, mất biometric, mất file `.xkey`.
- Thêm encrypted multi-device transfer qua QR nhiều đoạn hoặc file tạm.
- Thêm tùy chọn hardware-backed only cho người dùng cần bảo mật cao.
- Thêm tính năng kiểm tra địa chỉ theo checksum/network.
- Thêm template backup giấy: địa chỉ, network, ghi chú, không chứa private key nếu người dùng chọn.
- Hỗ trợ desktop/PWA ổn định hơn nếu muốn dùng xKey như kho ví offline trên máy tính.

## 6. Định hướng phát triển tương lai

xKey nên đi theo hướng “offline vault chuyên nghiệp cho người dùng có nhiều ví”. Không nên biến xKey thành ví giao dịch online quá sớm vì điều đó làm tăng rủi ro bảo mật, RPC, phishing, quyền ký giao dịch và surface tấn công.

Định hướng phù hợp:

1. Ưu tiên an toàn dữ liệu: backup, restore, migration, cảnh báo rõ ràng, audit vault.
2. Ưu tiên thao tác nhanh với nhiều ví: folder, tag, filter, batch edit, CSV, QR, tạo ví đẹp.
3. Ưu tiên Android native ổn định: Device Credential, Keystore, clipboard, file picker, share/download QR.
4. Ưu tiên giao diện dense nhưng rõ: scale, compact mode, responsive tablet, toast ngắn, modal không che lấp.
5. Ưu tiên minh bạch: Security Status, release notes, version rõ trong app, hướng dẫn backup và wipe.

## 7. Kết luận

Dự án đang có nền tảng tốt: tính năng nhiều, offline-first rõ ràng, Android Credential đã đi đúng hướng, giao diện đã được tối ưu mạnh cho mobile/tablet và có bộ công cụ quản lý ví phong phú.

Những việc cần ưu tiên tiếp theo không phải thêm thật nhiều tính năng mới, mà là làm app “khó lỗi hơn”:

- Hoàn thiện i18n.
- Hardening release Android.
- Làm rõ mô hình bảo mật Keystore/fallback.
- Thêm test tự động cho luồng quan trọng.
- Kiểm soát dependency audit.
- Chuẩn hóa encryption format dài hạn.

Nếu xử lý tốt các điểm này, xKey có thể phát triển thành một công cụ vault offline đáng tin cậy cho người dùng quản lý nhiều ví Web3.
