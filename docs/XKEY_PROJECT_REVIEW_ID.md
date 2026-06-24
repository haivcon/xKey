# Laporan Tinjauan Proyek xKey

Tanggal Tinjauan: 2026-06-16
Versi Saat Ini: 5.7.0
Cakupan: kode sumber React/Vite, Capacitor Android, penyimpanan, keamanan, UI, multi-bahasa, build, dan arah produk.

## 1. Tujuan Proyek

xKey adalah aplikasi manajemen brankas (vault) dompet Web3 yang mengutamakan offline (offline-first). Aplikasi ini memungkinkan pengguna untuk menyimpan alamat dompet, kunci pribadi (private keys), seed phrase, catatan, label, folder, kode QR, file cadangan `.xkey`, data CSV, dan saldo aset secara lokal di perangkat.

Tujuan utama dari xKey adalah untuk menjadi "brankas kunci pribadi" lokal, bukan dompet transaksi online. Pengguna dapat menggunakan xKey untuk:

- Mengelola banyak dompet Web3 dalam satu brankas terenkripsi.
- Menyimpan kunci pribadi dan seed phrase dalam format terenkripsi lokal.
- Membuat dompet baru, mengimpor dompet secara manual, menghasilkan dompet cantik (vanity wallets) berdasarkan awalan/akhiran.
- Mengelompokkan dompet berdasarkan folder, label, jaringan, status disematkan, atau saldo.
- Melakukan pencadangan/pemulihan menggunakan file `.xkey` yang dilindungi kata sandi.
- Mengekspor CSV bila diperlukan untuk inventaris atau audit.
- Memindai, menampilkan, membagikan, dan mengunduh kode QR untuk alamat atau data dompet.
- Melacak saldo secara manual dalam unit opsional seperti `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, poin, atau label khusus.
- Menggunakan Android Device Credential untuk membuka brankas dengan sidik jari, wajah, PIN, kata sandi, atau pola perangkat.

## 2. Kekuatan Saat Ini

### Keamanan dan Penyimpanan

- Data dompet dienkripsi secara lokal, sesuai dengan tujuan brankas offline.
- Bidang sensitif seperti kunci pribadi dan seed phrase dienkripsi tambahan di tingkat bidang sebelum seluruh daftar dompet dienkripsi.
- Native Android memiliki plugin Device Credential khusus, yang menggunakan Android Keystore untuk membungkus kunci brankas.
- `android:allowBackup="false"` ditetapkan di AndroidManifest, mengurangi risiko pencadangan data aplikasi yang tidak disengaja.
- Mencakup mekanisme seperti kunci otomatis saat tidak ada aktivitas, pembersihan otomatis papan klip (clipboard), perisai privasi saat aplikasi tidak aktif, dan permintaan kata sandi master saat melihat data sensitif.
- Mendukung penghapusan/penyetelan ulang (wipe/reset) ketika brankas mengalami kesalahan kritis.

### Pengalaman Pengguna

- Halaman beranda mendukung tata letak responsif, dengan daftar dompet multi-kolom di layar besar dan optimalisasi untuk perangkat seluler.
- Menampilkan penskalaan tampilan yang dapat disesuaikan dari 5% hingga 200%, cocok untuk perangkat kecil atau pengguna yang ingin melihat lebih banyak data.
- Menyediakan mode padat/ringkas/sangat ringkas (dense/compact/ultra compact) untuk daftar dompet.
- Tombol untuk menyalin, QR, memperluas dompet, menambah dompet, alat, pencarian, filter, dan urutkan ditempatkan di dekat alur kerja aktual.
- Menampilkan folder dompet cantik (vanity), label NEW, cincin bercahaya untuk dompet yang baru dibuat, dan navigasi otomatis ke folder yang berisi dompet baru.
- Modal edit saldo mencakup pencarian, tempel, salin alamat, impor CSV, filter, dan penyimpanan draf otomatis.
- Toasts/konfirmasi telah diubah agar terlihat lebih profesional dan cenderung menskalakan sesuai dengan rasio tampilan.

### Fitur

- Membuat dompet biasa, mengimpor manual, dan menghasilkan dompet cantik (vanity) menggunakan worker khusus.
- Cadangan `.xkey`, impor/ekspor CSV, pendeteksi duplikat, analitik, alat lanjutan.
- Transfer QR yang dilindungi kata sandi, pemindai QR, berbagi/unduh QR.
- Mendukung jaringan populer: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Dukungan multi-bahasa dengan 15 bahasa.
- Versi diambil dari `package.json`/informasi aplikasi asli dan ditampilkan di dalam aplikasi.

### Build dan Android

- `npm run lint` selesai dengan sukses.
- `npm run build` selesai dengan sukses.
- `npx cap sync android` berhasil menyinkronkan aset web ke Android.
- Versi Android saat ini adalah `versionName "5.7.0"` dan `versionCode 57`.
- `.gitignore` dengan benar mengecualikan `1/`, artefak build, rahasia penandatanganan, `.xkey`, APK/AAB, dan file lokal.

## 3. Kelemahan dan Potensi Masalah

### Tingkat Tinggi

1. Ketergantungan memiliki peringatan keamanan dari `npm audit`.

   Menjalankan `npm audit --omit=dev` melaporkan:

   - `vite 8.0.0 - 8.0.15`: tingkat keparahan tinggi, terkait dengan path/UNC Windows di server dev.
   - `ws` melalui `ethers`: tingkat keparahan tinggi/sedang. `npm audit fix --force` menyarankan penurunan versi `ethers` ke mayor 5, yang dapat menyebabkan perubahan yang merusak (breaking changes).

   Rekomendasi: Perbarui Vite dengan aman dalam rentang patch/minor terlebih dahulu. Untuk `ethers/ws`, periksa versi `ethers` yang lebih baru atau ganti `ws` jika didukung di hulu (upstream); hindari menggunakan `--force` secara membabi buta.

2. Rilis Android belum mengaktifkan shrink/minify.

   `android/app/build.gradle` saat ini memiliki `release { minifyEnabled false }`. Ini tidak membuat aplikasi mogok, tetapi membuat APK/AAB lebih mudah direkayasa balik dan ukurannya lebih besar.

   Rekomendasi: Coba aktifkan R8/ProGuard untuk rilis, tambahkan aturan simpan (keep rules) untuk Capacitor/plugin jika diperlukan, dan uji secara menyeluruh sebelum menerbitkan.

3. Kunci AES fallback masih disimpan di Preferences.

   Kode saat ini menyimpan `xkey_aes_fallback` untuk pemulihan atau kompatibilitas web/fallback. Ini adalah trade-off untuk mengurangi risiko kehilangan brankas saat mengubah metode kunci perangkat, tetapi dalam hal keamanan asli Android, ini lebih lemah daripada hanya menyimpan kunci di Keystore.

   Rekomendasi: Pisahkan dengan jelas kedua mode:
   - Mode Aman Android: Kunci hanya dibuka (unwrapped) melalui Keystore/kredensial perangkat.
   - Mode Kompatibilitas: Menyimpan kunci fallback, dengan peringatan yang jelas ditampilkan kepada pengguna.

4. Beberapa terjemahan sekunder masih berisi string bahasa Inggris.

   Pemeriksaan otomatis menunjukkan banyak lokal seperti `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` masih memiliki string seperti `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Rekomendasi: Buat skrip pemeriksaan i18n di CI untuk menggagalkan build jika sebuah lokal kehilangan kunci atau masih memiliki kunci mentah yang penting.

### Tingkat Menengah

1. Lokal yang kehilangan kunci dalam banyak bahasa.

   Dibandingkan dengan `en.js`, sebagian besar lokal selain `vi` kehilangan:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Karena `LanguageContext` kembali ke bahasa Inggris, aplikasi tidak mogok, tetapi pengalaman multi-bahasa tidak lengkap.

2. `chainBulk` adalah kunci tambahan di banyak lokal.

   Banyak lokal memiliki grup `chainBulk.*`, tetapi `en.js` tidak. Ini mungkin kunci lama atau kunci yang tidak disinkronkan. Meskipun tidak menyebabkan kesalahan langsung, mereka membuat manajemen terjemahan menjadi sulit.

3. Mode kata sandi CryptoJS AES bukanlah standar enkripsi yang paling modern.

   `CryptoJS.AES.encrypt(data, key)` berfungsi, tetapi tidak sejelas model standar dengan tag salt/KDF/IV/auth khusus. AES-GCM atau WebCrypto akan lebih mudah untuk diaudit.

   Rekomendasi jangka panjang: Migrasikan format brankas ke WebCrypto AES-GCM, dengan parameter PBKDF2/Argon2id yang didefinisikan secara eksplisit, payload versi, dan tag otentikasi wajib.

4. Kata sandi master menggunakan PBKDF2 dengan 10.000 iterasi.

   Tingkat ini agak rendah menurut standar saat ini untuk melindungi data sensitif. Meskipun ini adalah kata sandi sekunder untuk melihat kunci pribadi/seed dan bukan kunci brankas utama, kata sandi ini harus tetap ditingkatkan.

   Rekomendasi: Tingkatkan iterasi berdasarkan tolak ukur perangkat, dan simpan hash versi sehingga migrasi tidak merusak data lama.

5. Pembersihan otomatis papan klip tidak dijamin secara mutlak di semua platform.

   Kode memeriksa apakah papan klip masih memegang nilai yang benar sebelum membersihkannya, yang merupakan pendekatan yang baik. Namun, Android/browser dapat membatasi penulisan papan klip saat tidak dipicu oleh gerakan pengguna.

   Rekomendasi: Jelaskan dengan gamblang di UI bahwa "xKey akan berusaha membersihkan papan klip jika OS mengizinkannya", tanpa janji mutlak.

6. Kurangnya tes otomatis praktis.

   Proyek ini memiliki linting dan building, tetapi tidak memiliki pengujian unit/e2e untuk alur kritis seperti membuka kunci, impor/ekspor, pembuatan dompet cantik (vanity), pengeditan saldo, operasi papan klip, dan i18n.

   Rekomendasi: Tambahkan tes asap (smoke tests) menggunakan Playwright untuk web dan daftar periksa untuk instrumentasi Android/pengujian rilis manual.

### Tingkat Rendah

1. `console.error` masih ada di beberapa tempat.

   Bukan hal kritis, tetapi harus dikelompokkan ke dalam pencatat (logger) atau lingkungan khusus pengembang untuk menghindari kebocoran tumpukan (stacks) yang tidak perlu di produksi.

2. Vite memperingatkan tentang potongan (chunks) besar.

   Potongan `index` dan `scan` besar. Ini bukan kesalahan waktu proses (runtime error), tetapi dapat memperlambat pemuatan aplikasi pada perangkat kelas bawah.

   Rekomendasi: Muat lambat (Lazy load) untuk pemindai QR, jalur yang menggunakan banyak ether, alat lanjutan, dan tampilan dasbor yang lebih dalam.

3. Beberapa elemen UI mungkin rusak pada rasio skala yang sangat rendah atau sangat tinggi.

   Aplikasi menangani penskalaan dengan baik di banyak area, tetapi modal besar, kode QR, bentuk padat, lembar bawah (bottom sheets), dan kartu dompet masih perlu diuji pada 5%, 50%, 75%, 100%, 150%, dan 200%.

## 4. Evaluasi Grup Fitur

### Keamanan Buka Kunci

Pendekatan Android Device Credential benar, karena memungkinkan OS menangani biometrik dan fallback ke PIN/kata sandi/pola. Risiko utama terletak pada migrasi antara mekanisme PIN lama, kunci fallback, dan kunci Keystore.

Rekomendasi:
- Sediakan layar "Status Keamanan Brankas": Android Secure, Web Fallback, Compatibility, memerlukan penyiapan kunci perangkat.
- Jika kunci yang tidak valid terdeteksi, jangan otomatis membuat kunci brankas baru jika brankas lama masih berisi teks sandi (ciphertext); arahkan pengguna ke pemulihan/penghapusan (recovery/wipe) sebagai gantinya.
- Catat status buka kunci internal tanpa mencatat data sensitif.

### Pembuatan Dompet Vanity

Menggunakan worker terpisah adalah benar karena mencegah antarmuka pengguna dari pembekuan. Pembaruan terbaru seperti jumlah dompet, penyimpanan otomatis ke folder, jeda kunci otomatis selama pembuatan, batas waktu, dan peringatan pola panjang semuanya masuk akal.

Rekomendasi:
- Menampilkan dengan jelas kemungkinan/perkiraan waktu berdasarkan panjang pola.
- Izinkan menjeda/melanjutkan/menghentikan pekerjaan.
- Simpan riwayat pekerjaan yang dihasilkan sehingga pengguna tahu dompet mana yang berasal dari batch mana.
- Berikan peringatan keras untuk pola yang terlalu panjang di ponsel.

### Pengeditan Saldo Ase

Alur kerja saat ini cocok untuk pengguna yang memverifikasi alamat pada block explorer kemudian memasukkan saldo secara manual. Kekuatan termasuk pencarian, salin alamat, tempel, filter, dukungan CSV, dan simpan otomatis draf.

Rekomendasi:
- Tambahkan mode "verifikasi langkah-demi-langkah": layar menampilkan 1 dompet pada satu waktu, alamat lengkap, tombol salin, tautan penjelajah berdasarkan jaringan, dan bidang input besar.
- Memungkinkan penandaan sebagai "dicentang" (checked) untuk menghindari melewati entri.
- Izinkan impor CSV dengan kolom `address,balance,unit,network`.
- Tambahkan fitur batal (undo) untuk edit terakhir.

### Multi-Bahasa

Mengembalikan ke bahasa Inggris mencegah kerusakan UI, tetapi produk yang menargetkan audiens internasional memerlukan kontrol terjemahan yang lebih ketat.

Rekomendasi:
- Buat skrip `npm run i18n:check`.
- Laporkan kunci yang hilang, kunci ekstra, dan kunci terjemahan mentah di UI.
- Prioritaskan terjemahan akurat untuk grup keamanan, cadangan, hapus (wipe), kunci pribadi, dan seed phrase.

### Rilis Android

Konfigurasi saat ini cukup untuk membangun dan menyinkronkan, tetapi pengerasan (hardening) rilis masih kurang.

Rekomendasi:
- Aktifkan minify untuk rilis setelah pengujian.
- Tambahkan langkah CI `npm audit --omit=dev` dengan daftar izin (allowlist) yang jelas.
- Bangun APK/AAB melalui GitHub Actions pada pendorongan tag (tag pushes).
- Simpan catatan rilis berversi di repositori.

## 5. Ide Peningkatan yang Diusulkan

### Jangka Pendek

- Perbaiki semua kunci terjemahan yang hilang: `common.warning`, `createWallet.vanityLongTitle`.
- Bersihkan string bahasa Inggris yang tertinggal di lokal lain.
- Tambahkan skrip periksa i18n ke CI.
- Perbarui Vite untuk menyelesaikan peringatan (advisory) saat ini.
- Tambahkan halaman "Status Keamanan" di pengaturan.
- Tambahkan catatan yang jelas bahwa pembersihan otomatis papan klip adalah upaya terbaik (best-effort).
- Tambahkan tombol "buka di explorer" berdasarkan jaringan dalam modal edit saldo.
- Tambahkan snackbar batal (undo) untuk penghapusan dompet, edit saldo, dan perubahan folder.

### Jangka Menengah

- Migrasikan format enkripsi ke WebCrypto AES-GCM yang diversi.
- Pisahkan Mode Aman Android dan Mode Kompatibilitas.
- Tambahkan tes asap (smoke tests) Playwright untuk alur utama.
- Muat lambat pemindai/analitik/alat lanjutan untuk mengurangi ukuran bundel awal.
- Tambahkan pengaturan ekspor/impor yang tidak menyertakan data sensitif.
- Tambahkan mode "Audit Brankas": dompet yang kehilangan cadangan, alamat duplikat, jaringan yang hilang, nama yang hilang, atau kunci pribadi yang tidak cocok dengan alamat.

### Jangka Panjang

- Bangun panduan pemulihan resmi untuk skenario seperti mengganti perangkat, mengganti kunci layar, kehilangan biometrik, atau kehilangan file `.xkey`.
- Tambahkan transfer multi-perangkat terenkripsi melalui kode QR multi-bagian atau file sementara.
- Tambahkan opsi yang hanya didukung perangkat keras untuk pengguna dengan keamanan tinggi.
- Tambahkan validasi alamat melalui checksum/jaringan.
- Sediakan templat cadangan kertas: alamat, jaringan, catatan, tidak termasuk kunci pribadi jika dipilih oleh pengguna.
- Dukungan desktop/PWA yang lebih baik untuk menggunakan xKey sebagai brankas offline desktop.

## 6. Arah Produk Masa Depan

xKey harus mengejar jalur "brankas offline profesional untuk pengguna dengan banyak dompet". Seharusnya tidak diubah menjadi dompet transaksi online secara prematur, karena hal itu meningkatkan risiko keamanan, ketergantungan RPC, vektor phishing, kewajiban penandatanganan transaksi, dan permukaan serangan.

Arah yang Tepat:
1. Prioritaskan keamanan data: pencadangan, pemulihan, migrasi, peringatan yang jelas, audit brankas.
2. Prioritaskan pengelolaan cepat banyak dompet: folder, tag, filter, edit massal, CSV, QR, pembuatan vanity.
3. Prioritaskan fitur asli Android yang stabil: Device Credential, Keystore, manajemen clipboard, pemilih file, bagikan/unduh QR.
4. Prioritaskan UI yang padat namun jelas: penskalaan, mode ringkas, tata letak tablet responsif, toast pendek, modal tidak memblokir.
5. Prioritaskan transparansi: Status Keamanan, catatan rilis, pembuatan versi eksplisit di aplikasi, panduan pencadangan dan penghapusan.

## 7. Kesimpulan

Proyek ini memiliki fondasi yang kuat: kaya fitur, pendekatan pertama offline (offline-first) yang jelas, integrasi Android Credential berada di jalur yang benar, UI sangat dioptimalkan untuk perangkat seluler/tablet, dan menawarkan seperangkat alat manajemen dompet yang komprehensif.

Prioritas utama ke depan bukanlah menambahkan banyak fitur baru, tetapi membuat aplikasi "lebih sulit untuk dirusak":
- Selesaikan implementasi i18n.
- Perkeras (Harden) rilis Android.
- Perjelas model keamanan Keystore/fallback.
- Tambahkan pengujian otomatis untuk alur penting.
- Kelola audit dependensi.
- Standarkan format enkripsi untuk jangka panjang.

Jika poin-poin ini ditangani dengan baik, xKey dapat tumbuh menjadi alat brankas offline yang sangat andal bagi pengguna yang mengelola banyak dompet Web3.
