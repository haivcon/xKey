# xKey Proje İnceleme Raporu

İnceleme Tarihi: 2026-06-16
Mevcut Sürüm: 5.7.0
Kapsam: React/Vite kaynak kodu, Capacitor Android, depolama, güvenlik, kullanıcı arayüzü (UI), çoklu dil, derleme ve ürün yönü.

## 1. Projenin Amacı

xKey, çevrimdışı öncelikli (offline-first) bir Web3 cüzdan kasa (vault) yönetimi uygulamasıdır. Uygulama, kullanıcıların cüzdan adreslerini, özel anahtarlarını, başlangıç ifadelerini (seed phrases), notları, etiketleri, klasörleri, QR kodlarını, `.xkey` yedek dosyalarını, CSV verilerini ve varlık bakiyelerini cihazda yerel olarak saklamasına olanak tanır.

xKey'in temel amacı çevrimiçi bir işlem cüzdanı olmak yerine, yerel bir "özel anahtar kasası" olmaktır. Kullanıcılar xKey'i şunlar için kullanabilirler:

- Birden fazla Web3 cüzdanını şifrelenmiş bir kasada yönetmek.
- Özel anahtarları ve başlangıç ifadelerini yerel şifrelenmiş formatta saklamak.
- Yeni cüzdanlar oluşturmak, cüzdanları manuel olarak içe aktarmak, önek/sonek ile özel (vanity) cüzdanlar oluşturmak.
- Cüzdanları klasörlere, etiketlere, ağlara, sabitlenmiş duruma veya bakiyelere göre gruplandırmak.
- Parola korumalı `.xkey` dosyalarını kullanarak yedekleme/geri yükleme yapmak.
- Envanter veya denetim gerektiğinde CSV dışa aktarımı yapmak.
- Adresler veya cüzdan verileri için QR kodlarını taramak, görüntülemek, paylaşmak ve indirmek.
- Bakiyeleri `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, puanlar veya özel etiketler gibi isteğe bağlı birimlerde manuel olarak takip etmek.
- Kasayı cihazın parmak izi, yüzü, PIN'i, şifresi veya deseni ile açmak için Android Cihaz Kimlik Bilgisini (Device Credential) kullanmak.

## 2. Mevcut Güçlü Yönler

### Güvenlik ve Depolama

- Cüzdan verileri yerel olarak şifrelenerek çevrimdışı kasa hedefiyle uyumlu hale getirilmiştir.
- Özel anahtarlar ve başlangıç ifadeleri gibi hassas alanlar, tüm cüzdan listesi şifrelenmeden önce alan düzeyinde ek olarak şifrelenir.
- Yerel Android sürümü, kasa anahtarını sarmak (wrap) için Android Keystore'u kullanan özel bir Device Credential eklentisine sahiptir.
- AndroidManifest dosyasında `android:allowBackup="false"` ayarlanmıştır, bu da istenmeyen uygulama verisi yedekleme riskini azaltır.
- İşlemsizlik durumunda otomatik kilitleme, panoyu (clipboard) otomatik temizleme, uygulama etkin değilken gizlilik kalkanı ve hassas verileri görüntülerken ana parola (master password) istemleri gibi mekanizmalar içerir.
- Kasa kritik bir hatayla karşılaştığında silme/sıfırlama (wipe/reset) desteği sunar.

### Kullanıcı Deneyimi

- Ana sayfa, büyük ekranlarda çok sütunlu bir cüzdan listesi ve mobil için optimizasyon ile duyarlı (responsive) bir düzeni destekler.
- Küçük cihazlar veya daha fazla veri görüntülemek isteyen kullanıcılar için uygun olan %5'ten %200'e kadar özelleştirilebilir görüntü ölçekleme özelliğine sahiptir.
- Cüzdan listesi için yoğun (dense)/kompakt/ultra kompakt modları sağlar.
- Kopyalama, QR, cüzdanı genişletme, cüzdan ekleme, araçlar, arama, filtreleme ve sıralama düğmeleri gerçek iş akışına yakın bir yere yerleştirilmiştir.
- Özel (vanity) cüzdan klasörü, NEW etiketleri, yeni oluşturulan cüzdanlar için parlayan bir halka ve yeni cüzdanı içeren klasöre otomatik gezinme özellikleri bulunur.
- Bakiye düzenleme modülü (modal); arama, yapıştırma, adres kopyalama, CSV içe aktarma, filtreleme ve taslakları otomatik kaydetme işlemlerini içerir.
- Bildirimler (Toasts)/onaylamalar daha profesyonel görünecek şekilde yenilenmiştir ve ekran oranına göre ölçeklenme eğilimindedir.

### Özellikler

- Normal cüzdanlar oluşturmak, manuel olarak içe aktarmak ve özel bir işçi (worker) kullanarak özel (vanity) cüzdanlar oluşturmak.
- `.xkey` yedeklemesi, CSV içe/dışa aktarımı, yinelenen algılayıcı, analizler, gelişmiş araçlar.
- Parola korumalı QR aktarımı, QR tarayıcı, QR paylaşma/indirme.
- Popüler ağları destekler: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- 15 dil ile çoklu dil desteği.
- Sürüm, `package.json`/yerel uygulama bilgisinden alınır ve uygulama içinde görüntülenir.

### Derleme ve Android

- `npm run lint` başarıyla tamamlanır.
- `npm run build` başarıyla tamamlanır.
- `npx cap sync android` web varlıklarını Android ile başarıyla eşitler.
- Mevcut Android sürümü `versionName "5.7.0"` ve `versionCode 57` şeklindedir.
- `.gitignore`; `1/`, derleme artefaktları (artifacts), imzalama sırları (signing secrets), `.xkey`, APK/AAB ve yerel dosyaları uygun şekilde hariç tutar.

## 3. Zayıf Yönler ve Olası Sorunlar

### Yüksek Seviye

1. Bağımlılıklar, `npm audit`'ten güvenlik uyarılarına sahiptir.

   `npm audit --omit=dev` çalıştırıldığında şu rapor edilir:

   - `vite 8.0.0 - 8.0.15`: yüksek önem derecesi, dev sunucusundaki Windows yolu/UNC ile ilgili.
   - `ethers` üzerinden `ws`: yüksek/orta önem derecesi. `npm audit fix --force`, `ethers`'i büyük sürüm 5'e (major 5) düşürmeyi önerir; bu da uyumsuzluk değişikliklerine (breaking changes) neden olabilir.

   Öneri: Vite'i önce yama (patch)/ikincil (minor) sürüm aralığında güvenli bir şekilde güncelleyin. `ethers/ws` için daha yeni bir `ethers` sürümünün olup olmadığını kontrol edin veya yukarı akışta (upstream) destekleniyorsa `ws`'yi geçersiz kılın (override); `--force` komutunu körü körüne kullanmaktan kaçının.

2. Android sürümü (release) shrink/minify işlevini etkinleştirmemiştir.

   `android/app/build.gradle` şu anda `release { minifyEnabled false }` kodunu içermektedir. Bu, uygulamanın çökmesine neden olmaz ancak APK/AAB'nin tersine mühendisliğini (reverse engineering) kolaylaştırır ve boyutunu büyütür.

   Öneri: Sürüm (release) için R8/ProGuard'ı etkinleştirmeyi deneyin, gerekirse Capacitor/eklentiler için koruma kuralları (keep rules) ekleyin ve yayınlamadan önce kapsamlı bir şekilde test edin.

3. Yedek (Fallback) AES anahtarı hâlâ Tercihlerde (Preferences) saklanmaktadır.

   Kod şu anda kurtarma veya web/yedekleme uyumluluğu için `xkey_aes_fallback` saklamaktadır. Bu, cihaz kilit yöntemlerini değiştirirken kasa kaybı riskini azaltmak için bir değiş tokuştur, ancak yerel Android güvenliği açısından anahtarı yalnızca Keystore'da tutmaktan daha zayıftır.

   Öneri: İki modu açıkça ayırın:
   - Android Güvenli Mod (Secure Mode): Anahtar, yalnızca Keystore/cihaz kimlik bilgisi (device credential) aracılığıyla açılır (unwrapped).
   - Uyumluluk Modu (Compatibility Mode): Kullanıcıya açık bir uyarı göstererek yedek (fallback) anahtarı tutar.

4. Bazı ikincil çeviriler hâlâ İngilizce dizeler (strings) içeriyor.

   Otomatik kontroller, `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` gibi birçok yerelin (locale) hâlâ `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics` gibi dizelere sahip olduğunu gösteriyor.

   Öneri: Bir yerelde (locale) anahtarlar eksik olduğunda veya önemli ham (raw) anahtarlar içerdiğinde derlemenin başarısız olması için CI'da bir i18n kontrol komut dosyası oluşturun.

### Orta Seviye

1. Birden çok dildeki yerellerde (locales) eksik anahtarlar var.

   `en.js` ile karşılaştırıldığında `vi` dışındaki yerellerin çoğunda şunlar eksiktir:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   `LanguageContext` İngilizce'ye geri döndüğü için uygulama çökmez ancak çok dilli deneyim tamamlanmamış olur.

2. `chainBulk` birçok yerelde fazladan (extra) bir anahtardır.

   Birçok yerelde `chainBulk.*` grubu bulunur ancak `en.js`'de yoktur. Bunlar eski anahtarlar veya senkronize edilmemiş anahtarlar olabilir. Doğrudan hatalara neden olmasalar da, çeviri yönetimini zorlaştırırlar.

3. CryptoJS AES anahtar sözcüğü (passphrase) modu, en modern şifreleme standardı değildir.

   `CryptoJS.AES.encrypt(data, key)` çalışır, ancak özel salt/KDF/IV/auth etiketleri olan standart bir model kadar açık değildir. AES-GCM veya WebCrypto'nun denetlenmesi (audit) daha kolay olacaktır.

   Uzun vadeli öneri: Açıkça tanımlanmış PBKDF2/Argon2id parametreleri, sürümlendirilmiş yükler (versioned payloads) ve zorunlu kimlik doğrulama (authentication) etiketleriyle kasa formatını WebCrypto AES-GCM'ye taşıyın.

4. Ana parola (master password), 10.000 döngü (iterations) içeren PBKDF2 kullanır.

   Bu seviye, hassas verilerin korunması konusundaki günümüz standartlarına göre biraz düşüktür. Bu, özel anahtarları/başlangıç ifadelerini görüntülemek için kullanılan ikincil bir parola olmasına ve ana kasa anahtarı olmamasına rağmen, yine de artırılmalıdır.

   Öneri: Döngü sayısını cihazın kıyaslamalarına (benchmarks) göre artırın ve geçişlerin (migrations) eski verileri bozmaması için sürüm karmasını (version hash) saklayın.

5. Pano otomatik temizleme özelliği (clipboard auto-clear), tüm platformlarda kesin olarak garanti edilmez.

   Kod, temizlemeden önce panonun hâlâ doğru değeri tutup tutmadığını kontrol eder ve bu iyi bir yaklaşımdır. Ancak, bir kullanıcı eylemiyle tetiklenmediğinde Android/tarayıcılar pano yazma işlemlerini kısıtlayabilir.

   Öneri: Arayüzde (UI), "OS izin veriyorsa xKey panoyu temizlemeye çalışacaktır" şeklinde kesin sözler vermeden net bir açıklama yapın.

6. Pratik otomatik test eksikliği.

   Projede lint işlemi ve derleme (build) bulunuyor ancak kilit açma, içe/dışa aktarma, özel cüzdan oluşturma, bakiye düzenleme, pano işlemleri ve i18n gibi kritik akışlar için birim (unit)/e2e testleri eksik.

   Öneri: Web için Playwright'ı kullanan duman testleri (smoke tests) ve Android araçları (instrumentation)/manuel sürüm testleri için bir kontrol listesi (checklist) ekleyin.

### Düşük Seviye

1. `console.error` bazı yerlerde kalmış.

   Kritik değil, ancak üretim (production) ortamında gereksiz yığınların (stacks) sızmasını önlemek için bir kaydedicide (logger) veya salt geliştirme (dev-only) ortamında gruplandırılmalıdır.

2. Vite, büyük parçalar (chunks) hakkında uyarı veriyor.

   `index` ve `scan` parçaları (chunks) büyüktür. Bu bir çalışma zamanı (runtime) hatası değildir ancak uygulamanın düşük donanımlı cihazlarda yavaş yüklenmesine neden olabilir.

   Öneri: QR tarayıcı, ağır ethers yolları, gelişmiş araçlar ve daha derin kontrol paneli görünümleri için tembel yükleme (Lazy load) yapın.

3. Bazı UI öğeleri, çok düşük veya çok yüksek ölçekleme oranlarında bozulabilir.

   Uygulama ölçeklemeyi birçok alanda iyi idare eder ancak büyük modüller, QR kodları, yoğun formlar, alt sayfalar (bottom sheets) ve cüzdan kartlarının yine de %5, %50, %75, %100, %150 ve %200 oranlarında test edilmesi gerekir.

## 4. Özellik Grubu Değerlendirmesi

### Kilit Açma Güvenliği

İşletim sisteminin (OS) biyometriği (biometrics) kullanmasını ve PIN/parola/desene geri dönmesini sağladığı için Android Cihaz Kimlik Bilgisi (Device Credential) yaklaşımı doğrudur. Temel risk eski PIN mekanizması, yedek (fallback) anahtarlar ve Keystore anahtarları arasındaki geçiştir.

Öneriler:
- "Kasa Güvenlik Durumu" ekranı sağlayın: Android Secure, Web Fallback, Compatibility; cihaz kilit kurulumunu gerektirir.
- Geçersiz kılınmış bir anahtar algılanırsa, eski kasa hâlâ şifrelenmiş metin (ciphertext) içeriyorsa otomatik olarak yeni bir kasa anahtarı oluşturmayın; bunun yerine kullanıcıyı kurtarma/silme (recovery/wipe) işlemlerine yönlendirin.
- Hassas verileri kaydetmeden dahili kilit açma durumlarını kaydedin.

### Özel (Vanity) Cüzdan Oluşturma

Ayrı bir işçi (worker) kullanmak, arayüzün (UI) donmasını engellediği için doğru bir yöntemdir. Cüzdan miktarı, klasöre otomatik kaydetme, üretim sırasında otomatik kilitlemeyi duraklatma, zaman sınırları ve uzun desen uyarıları gibi son geliştirmeler makul görünmektedir.

Öneriler:
- Desen (pattern) uzunluğuna göre olasılığı/tahmini süreyi açıkça gösterin.
- İşin duraklatılmasına/sürdürülmesine/durdurulmasına izin verin.
- Kullanıcıların hangi cüzdanların hangi gruptan geldiğini bilmesi için oluşturulan işlerin (jobs) geçmişini kaydedin.
- Mobil cihazlarda aşırı uzun desenler için güçlü uyarılar sağlayın.

### Varlık Bakiyesi Düzenleme

Mevcut iş akışı, blok gezginlerindeki (block explorers) adresleri doğrulayan ve ardından bakiyeleri manuel olarak giren kullanıcılara uygundur. Güçlü yönler arasında arama, adres kopyalama, yapıştırma, filtreleme, CSV desteği ve taslağı otomatik kaydetme bulunur.

Öneriler:
- "Adım adım doğrulama" modu ekleyin: Ekran her seferinde 1 cüzdanı, tam adresi, kopyalama düğmesini, ağa göre gezgin bağlantısını ve geniş bir giriş alanını gösterir.
- Girişleri atlamamak için "kontrol edildi" (checked) olarak işaretlemeye izin verin.
- `address,balance,unit,network` sütunlarına sahip CSV içe aktarımlarına izin verin.
- Son düzenleme işlemi için geri al (undo) özelliği ekleyin.

### Çoklu Dil

İngilizce'ye geri dönmek (Falling back), UI bozulmasını önler ancak uluslararası bir kitleyi hedefleyen ürünlerin daha sıkı bir çeviri kontrolüne ihtiyacı vardır.

Öneriler:
- Bir `npm run i18n:check` komut dosyası (script) oluşturun.
- Eksik anahtarları, fazladan anahtarları ve ham çeviri anahtarlarını arayüzde (UI) bildirin.
- Güvenlik, yedekleme, silme (wipe), özel anahtar ve başlangıç ifadesi grupları için doğru çevirilere öncelik verin.

### Android Sürümü (Release)

Mevcut yapılandırma derleme (build) ve eşitleme (sync) işlemleri için yeterlidir ancak sürüm sertleştirme (release hardening) eksiktir.

Öneriler:
- Testten sonra sürüm için küçültme (minify) özelliğini etkinleştirin.
- Açık bir izin listesi (allowlist) içeren bir `npm audit --omit=dev` CI adımı ekleyin.
- Etiket gönderimlerinde (tag pushes) GitHub Actions aracılığıyla APK/AAB oluşturun.
- Depoda sürümlendirilmiş sürüm notlarını (release notes) saklayın.

## 5. Önerilen Yükseltme Fikirleri

### Kısa Vadeli

- Eksik tüm çeviri anahtarlarını düzeltin: `common.warning`, `createWallet.vanityLongTitle`.
- Diğer yerellerde (locales) kalan İngilizce dizeleri (strings) temizleyin.
- CI'a bir i18n kontrol komut dosyası (script) ekleyin.
- Mevcut öneriyi (advisory) çözmek için Vite'i güncelleyin.
- Ayarlara "Güvenlik Durumu" (Security Status) sayfası ekleyin.
- Pano otomatik temizleme özelliğinin elden gelen en iyi çaba (best-effort) olduğunu belirten net bir not ekleyin.
- Bakiye düzenleme modülüne ağa göre bir "gezginde aç" düğmesi ekleyin.
- Cüzdan silme, bakiye düzenlemeleri ve klasör değişiklikleri için geri alma (undo) uyarıları (snackbars) ekleyin.

### Orta Vadeli

- Şifreleme formatını sürümlendirilmiş (versioned) WebCrypto AES-GCM'ye taşıyın.
- Android Güvenli Modu (Secure Mode) ve Uyumluluk Modunu ayırın.
- Ana akışlar için Playwright duman testleri (smoke tests) ekleyin.
- Başlangıç paket boyutunu azaltmak için tarayıcı/analitik/gelişmiş araçları tembel yükleyin (Lazy load).
- Hassas verileri dışlayan ayar (settings) dışa/içe aktarımı ekleyin.
- "Kasa Denetimi" (Vault Audit) modu ekleyin: Yedeklemeleri eksik olan cüzdanlar, mükerrer adresler, eksik ağlar, eksik isimler veya adreslerle eşleşmeyen özel anahtarlar.

### Uzun Vadeli

- Cihaz değiştirme, ekran kilitlerini değiştirme, biyometrik verileri kaybetme veya `.xkey` dosyalarını kaybetme gibi senaryolar için resmi bir kurtarma kılavuzu (recovery guide) oluşturun.
- Çok parçalı QR kodları veya geçici dosyalar aracılığıyla şifrelenmiş çoklu cihaz aktarımı ekleyin.
- Yüksek güvenlikli kullanıcılar için yalnızca donanım destekli (hardware-backed-only) bir seçenek ekleyin.
- Sağlama toplamı (checksum)/ağ aracılığıyla adres doğrulama özelliği ekleyin.
- Kağıt yedekleme şablonları sağlayın: Adres, ağ, notlar, (kullanıcı tarafından seçilirse) özel anahtarlar hariç.
- xKey'i masaüstünde çevrimdışı bir kasa olarak kullanmak için daha iyi Masaüstü/PWA desteği sağlayın.

## 6. Gelecekteki Ürün Yönü

xKey, "çok sayıda cüzdanı olan kullanıcılar için profesyonel bir çevrimdışı kasa" yolunu izlemelidir. Çevrimiçi bir işlem cüzdanına erken dönüştürülmemelidir; aksi takdirde güvenlik riskleri, RPC bağımlılıkları, kimlik avı (phishing) saldırıları, işlem imzalama sorumlulukları ve saldırı yüzeyleri artacaktır.

Uygun Yön:
1. Veri güvenliğine öncelik vermek: yedekleme, geri yükleme, taşıma, net uyarılar, kasa denetimi.
2. Çok sayıda cüzdanın hızlı yönetimine öncelik vermek: klasörler, etiketler, filtreler, toplu düzenlemeler, CSV, QR, özel (vanity) oluşturma.
3. Kararlı Android yerel özelliklerine öncelik vermek: Device Credential, Keystore, pano yönetimi, dosya seçici, QR paylaşma/indirme.
4. Yoğun ancak net bir arayüze (UI) öncelik vermek: ölçekleme, kompakt mod, duyarlı (responsive) tablet düzenleri, kısa bildirimler (toasts), engellemeyen modüller.
5. Şeffaflığa öncelik vermek: Güvenlik Durumu, sürüm notları, uygulama içi açık sürümlendirme, yedekleme ve silme (wipe) kılavuzları.

## 7. Sonuç

Projenin sağlam bir temeli bulunuyor: zengin özelliklere sahip, net çevrimdışı öncelikli yaklaşım, Android Credential entegrasyonu doğru yolda, kullanıcı arayüzü (UI) mobil/tablet için büyük ölçüde optimize edilmiş ve kapsamlı bir cüzdan yönetimi araç seti sunuyor.

İleriye dönük olarak asıl öncelikler, sayısız yeni özellik eklemek değil, uygulamayı "kırılması daha zor (harder to break)" hale getirmektir:
- i18n uygulamasını tamamlayın.
- Android sürümünü (release) sertleştirin (Harden).
- Keystore/yedek (fallback) güvenlik modelini netleştirin.
- Kritik akışlar için otomatik testler ekleyin.
- Bağımlılık denetimlerini (dependency audits) yönetin.
- Şifreleme biçimini uzun vadeli standartlaştırın.

Bu noktalara iyi bir şekilde değinilirse, xKey birden fazla Web3 cüzdanını yöneten kullanıcılar için son derece güvenilir bir çevrimdışı kasa aracına dönüşebilir.
