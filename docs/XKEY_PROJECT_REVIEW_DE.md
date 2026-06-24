# xKey Projektüberprüfungsberich

Überprüfungsdatum: 2026-06-16
Aktuelle Version: 5.7.0
Umfang: React/Vite-Quellcode, Capacitor Android, Speicherung, Sicherheit, Benutzeroberfläche, Mehrsprachigkeit, Build und Produktrichtung.

## 1. Projektzweck

xKey ist eine primär offline funktionierende Web3-Wallet-Tresor-Verwaltungsanwendung. Die App ermöglicht es Benutzern, Wallet-Adressen, private Schlüssel, Seed-Phrasen, Notizen, Labels, Ordner, QR-Codes, `.xkey`-Backup-Dateien, CSV-Daten und Guthaben lokal auf dem Gerät zu speichern.

Das Kernziel von xKey ist es, ein lokaler "Tresor für private Schlüssel" zu sein und nicht eine Online-Transaktions-Wallet. Benutzer können xKey verwenden, um:

- Mehrere Web3-Wallets in einem verschlüsselten Tresor zu verwalten.
- Private Schlüssel und Seed-Phrasen in einem lokal verschlüsselten Format zu speichern.
- Neue Wallets zu erstellen, Wallets manuell zu importieren, Vanity-Wallets nach Präfix/Suffix zu generieren.
- Wallets nach Ordnern, Labels, Netzwerken, angeheftetem Status oder Guthaben zu gruppieren.
- Mit passwortgeschützten `.xkey`-Dateien Backups zu erstellen/wiederherzustellen.
- CSV zu exportieren, wenn eine Bestandsaufnahme oder Prüfung erforderlich ist.
- QR-Codes für Adressen oder Wallet-Daten zu scannen, anzuzeigen, zu teilen und herunterzuladen.
- Guthaben manuell in optionalen Einheiten wie `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, Punkten oder benutzerdefinierten Labels zu verfolgen.
- Android Device Credential zu verwenden, um den Tresor mit Fingerabdruck, Gesicht, PIN, Passwort oder Muster des Geräts zu entsperren.

## 2. Aktuelle Stärken

### Sicherheit und Speicherung

- Wallet-Daten werden lokal verschlüsselt, was dem Ziel eines Offline-Tresors entspricht.
- Sensible Felder wie private Schlüssel und Seed-Phrasen werden zusätzlich auf Feldebene verschlüsselt, bevor die gesamte Wallet-Liste verschlüsselt wird.
- Android Nativ verfügt über ein dediziertes Device Credential-Plugin, das den Android Keystore verwendet, um den Tresorschlüssel zu verpacken.
- `android:allowBackup="false"` ist im AndroidManifest gesetzt, was das Risiko ungewollter App-Daten-Backups verringert.
- Enthält Mechanismen wie automatische Sperrung bei Inaktivität, automatisches Löschen der Zwischenablage, Sichtschutz bei inaktiver App und Abfrage des Master-Passworts beim Anzeigen sensibler Daten.
- Unterstützt Wipe/Reset, wenn der Tresor auf einen kritischen Fehler stößt.

### Benutzererfahrung

- Die Startseite unterstützt ein responsives Layout mit einer mehrspaltigen Wallet-Liste auf großen Bildschirmen und ist für Mobilgeräte optimiert.
- Bietet anpassbare Anzeigeskalierung von 5 % bis 200 %, geeignet für kleine Geräte oder Benutzer, die mehr Daten sehen möchten.
- Bietet die Modi Dicht/Kompakt/Ultrakompakt für die Wallet-Liste.
- Schaltflächen für Kopieren, QR, Wallet erweitern, Wallet hinzufügen, Tools, Suchen, Filtern und Sortieren sind nah am tatsächlichen Workflow platziert.
- Verfügt über einen Vanity-Wallet-Ordner, NEW-Labels, einen leuchtenden Ring für neu erstellte Wallets und automatische Navigation zum Ordner, der das neue Wallet enthält.
- Das Modal zum Bearbeiten des Guthabens umfasst Suche, Einfügen, Adresse kopieren, CSV-Import, Filter und automatisches Speichern von Entwürfen.
- Toasts/Bestätigungen wurden überarbeitet, um professioneller auszusehen, und skalieren tendenziell entsprechend dem Anzeigeverhältnis.

### Funktionen

- Erstellen normaler Wallets, manueller Import und Generierung von Vanity-Wallets mithilfe eines dedizierten Workers.
- `.xkey`-Backup, CSV-Import/-Export, Duplikaterkennung, Analysen, erweiterte Tools.
- Passwortgeschützter QR-Transfer, QR-Scanner, QR-Teilen/Download.
- Unterstützt beliebte Netzwerke: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Mehrsprachige Unterstützung mit 15 Sprachen.
- Die Version wird aus `package.json`/nativen App-Informationen abgerufen und in der App angezeigt.

### Build und Android

- `npm run lint` wird erfolgreich abgeschlossen.
- `npm run build` wird erfolgreich abgeschlossen.
- `npx cap sync android` synchronisiert Web-Assets erfolgreich mit Android.
- Die aktuelle Android-Version ist `versionName "5.7.0"` und `versionCode 57`.
- `.gitignore` schließt `1/`, Build-Artefakte, Signaturgeheimnisse, `.xkey`, APK/AAB und lokale Dateien ordnungsgemäß aus.

## 3. Schwächen und potenzielle Probleme

### Hohe Prioritä

1. Abhängigkeiten weisen Sicherheitswarnungen von `npm audit` auf.

   Die Ausführung von `npm audit --omit=dev` meldet:

   - `vite 8.0.0 - 8.0.15`: hoher Schweregrad, bezogen auf Windows Path/UNC im Dev-Server.
   - `ws` via `ethers`: hoher/mittlerer Schweregrad. `npm audit fix --force` schlägt ein Downgrade von `ethers` auf Major 5 vor, was Breaking Changes verursachen könnte.

   Empfehlung: Aktualisieren Sie Vite zunächst sicher innerhalb des Patch-/Minor-Bereichs. Suchen Sie für `ethers/ws` nach einer neueren `ethers`-Version oder überschreiben Sie `ws`, falls dies Upstream unterstützt wird; vermeiden Sie die blinde Verwendung von `--force`.

2. Für das Android-Release ist Shrink/Minify nicht aktiviert.

   `android/app/build.gradle` hat derzeit `release { minifyEnabled false }`. Dies führt nicht zum Absturz der App, macht jedoch APK/AAB anfälliger für Reverse Engineering und vergrößert die Datei.

   Empfehlung: Versuchen Sie, R8/ProGuard für Release zu aktivieren, fügen Sie bei Bedarf Keep Rules für Capacitor/Plugins hinzu und testen Sie gründlich vor der Veröffentlichung.

3. Fallback-AES-Schlüssel wird immer noch in den Preferences gespeichert.

   Der Code speichert derzeit `xkey_aes_fallback` für Wiederherstellungs- oder Web-/Fallback-Kompatibilität. Dies ist ein Kompromiss, um das Risiko des Tresorverlusts beim Ändern von Gerätesperrmethoden zu verringern. In Bezug auf die native Android-Sicherheit ist es jedoch schwächer als die ausschließliche Aufbewahrung des Schlüssels im Keystore.

   Empfehlung: Trennen Sie die beiden Modi klar:
   - Android Secure Mode: Der Schlüssel wird nur über Keystore/Device Credential entpackt.
   - Kompatibilitätsmodus: Behält den Fallback-Schlüssel bei, wobei dem Benutzer eine klare Warnung angezeigt wird.

4. Einige sekundäre Übersetzungen enthalten immer noch englische Strings.

   Automatisierte Überprüfungen zeigen, dass viele Locales wie `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` immer noch Strings wie `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics` aufweisen.

   Empfehlung: Erstellen Sie ein i18n-Prüfskript in CI, das den Build fehlschlagen lässt, wenn in einem Locale Schlüssel fehlen oder noch wichtige Rohschlüssel vorhanden sind.

### Mittlere Prioritä

1. Locales fehlen Schlüssel in mehreren Sprachen.

   Im Vergleich zu `en.js` fehlen in den meisten Locales außer `vi`:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Da `LanguageContext` auf Englisch zurückfällt, stürzt die App nicht ab, aber das mehrsprachige Erlebnis ist unvollständig.

2. `chainBulk` ist ein überflüssiger Schlüssel in vielen Locales.

   Viele Locales haben die Gruppe `chainBulk.*`, aber `en.js` hat sie nicht. Dies könnten alte Schlüssel oder unsynchronisierte Schlüssel sein. Sie verursachen zwar keine direkten Fehler, erschweren aber das Übersetzungsmanagement.

3. Der CryptoJS AES Passphrase-Modus ist nicht der modernste Verschlüsselungsstandard.

   `CryptoJS.AES.encrypt(data, key)` funktioniert, ist aber nicht so explizit wie ein Standardmodell mit dedizierten Salt/KDF/IV/Auth-Tags. AES-GCM oder WebCrypto wären einfacher zu prüfen.

   Langfristige Empfehlung: Migrieren Sie das Tresorformat zu WebCrypto AES-GCM, mit explizit definierten PBKDF2/Argon2id-Parametern, versionierten Payloads und obligatorischen Authentifizierungs-Tags.

4. Das Master-Passwort verwendet PBKDF2 mit 10.000 Iterationen.

   Dieses Niveau ist nach heutigen Maßstäben für den Schutz sensibler Daten etwas niedrig. Obwohl es sich um ein sekundäres Passwort zum Anzeigen privater Schlüssel/Seeds und nicht um den Haupttresorschlüssel handelt, sollte es dennoch erhöht werden.

   Empfehlung: Erhöhen Sie die Iterationen basierend auf Geräte-Benchmarks und speichern Sie den Versions-Hash, damit Migrationen alte Daten nicht beschädigen.

5. Automatisches Löschen der Zwischenablage ist nicht auf allen Plattformen absolut garantiert.

   Der Code prüft, ob die Zwischenablage noch den korrekten Wert enthält, bevor sie gelöscht wird, was ein guter Ansatz ist. Allerdings können Android/Browser Schreibzugriffe auf die Zwischenablage einschränken, wenn sie nicht durch eine Benutzergeste ausgelöst werden.

   Empfehlung: Beschreiben Sie in der UI deutlich, dass "xKey versuchen wird, die Zwischenablage zu löschen, wenn das Betriebssystem dies zulässt", ohne absolute Versprechungen zu machen.

6. Mangel an praktischen automatisierten Tests.

   Das Projekt verfügt über Linting und Building, aber es fehlen Unit-/E2E-Tests für kritische Abläufe wie Entsperren, Import/Export, Vanity-Wallet-Erstellung, Guthabenbearbeitung, Zwischenablage-Operationen und i18n.

   Empfehlung: Fügen Sie Smoke-Tests mit Playwright für Web und eine Checkliste für Android-Instrumentierung/manuelle Release-Tests hinzu.

### Niedrige Prioritä

1. `console.error` verbleibt an einigen Stellen.

   Nicht kritisch, sollte aber in einem Logger oder Dev-Only-Umfeld gruppiert werden, um das Durchsickern unnötiger Stacks in der Produktion zu vermeiden.

2. Vite warnt vor großen Chunks.

   Die Chunks `index` und `scan` sind groß. Dies ist kein Laufzeitfehler, könnte aber das Laden der App auf schwächeren Geräten verlangsamen.

   Empfehlung: Lazy Load für QR-Scanner, ethers-lastige Pfade, erweiterte Tools und tiefere Dashboard-Ansichten.

3. Einige UI-Elemente könnten bei sehr niedrigen oder sehr hohen Skalierungsverhältnissen fehlerhaft dargestellt werden.

   Die App skaliert in vielen Bereichen gut, aber große Modale, QR-Codes, dichte Formulare, Bottom Sheets und Wallet-Karten müssen weiterhin bei 5 %, 50 %, 75 %, 100 %, 150 % und 200 % getestet werden.

## 4. Evaluierung der Funktionsgruppen

### Sicherheit der Entsperrung

Der Android Device Credential-Ansatz ist korrekt, da das Betriebssystem Biometrie und Fallback auf PIN/Passwort/Muster verwalten kann. Das Hauptrisiko liegt in der Migration zwischen dem alten PIN-Mechanismus, Fallback-Schlüsseln und Keystore-Schlüsseln.

Empfehlungen:
- Bereitstellung eines Bildschirms "Tresor-Sicherheitsstatus": Android Secure, Web Fallback, Compatibility, erfordert Einrichtung der Gerätesperre.
- Wenn ein ungültig gewordener Schlüssel erkannt wird, generieren Sie nicht automatisch einen neuen Tresorschlüssel, wenn der alte Tresor noch Chiffretext enthält; leiten Sie den Benutzer stattdessen zur Wiederherstellung/zum Wipe.
- Protokollieren Sie interne Entsperrstatus, ohne sensible Daten zu protokollieren.

### Generierung von Vanity-Wallets

Die Verwendung eines separaten Workers ist korrekt, da so ein Einfrieren der UI verhindert wird. Kürzliche Upgrades wie Wallet-Anzahl, automatisches Speichern in Ordner, Pausieren der automatischen Sperre während der Generierung, Zeitlimits und Warnungen vor langen Mustern sind alle vernünftig.

Empfehlungen:
- Anzeige von Wahrscheinlichkeit/geschätzter Zeit deutlich basierend auf der Musterlänge.
- Erlauben Sie das Pausieren/Fortsetzen/Stoppen des Jobs.
- Speichern Sie einen Verlauf der generierten Jobs, damit Benutzer wissen, welche Wallets aus welchem Batch stammen.
- Geben Sie auf Mobilgeräten deutliche Warnungen vor übermäßig langen Mustern aus.

### Bearbeitung von Asset-Guthaben

Der aktuelle Workflow passt zu Benutzern, die Adressen auf Block-Explorern überprüfen und dann Guthaben manuell eingeben. Zu den Stärken gehören Suche, Adresse kopieren, Einfügen, Filter, CSV-Unterstützung und automatisches Speichern von Entwürfen.

Empfehlungen:
- Fügen Sie einen "Schritt-für-Schritt-Verifizierungsmodus" hinzu: Bildschirm zeigt 1 Wallet nach dem anderen, vollständige Adresse, Kopieren-Schaltfläche, Explorer-Link nach Netzwerk und ein großes Eingabefeld.
- Ermöglichen Sie die Markierung als "überprüft", um das Überspringen von Einträgen zu vermeiden.
- Erlauben Sie CSV-Importe mit den Spalten `address,balance,unit,network`.
- Fügen Sie eine Rückgängig-Funktion für die letzte Bearbeitung hinzu.

### Mehrsprachigkei

Der Fallback auf Englisch verhindert das Brechen der Benutzeroberfläche, aber ein Produkt, das sich an ein internationales Publikum richtet, benötigt eine strengere Übersetzungskontrolle.

Empfehlungen:
- Erstellen Sie ein Skript `npm run i18n:check`.
- Melden Sie fehlende Schlüssel, überflüssige Schlüssel und rohe Übersetzungsschlüssel in der Benutzeroberfläche.
- Priorisieren Sie genaue Übersetzungen für Sicherheit, Backup, Wipe, private Schlüssel und Seed-Phrasen-Gruppen.

### Android Release

Die aktuelle Konfiguration reicht zum Erstellen und Synchronisieren aus, aber das Hardening des Release fehlt.

Empfehlungen:
- Aktivieren Sie Minify für Release nach Tests.
- Fügen Sie einen CI-Schritt `npm audit --omit=dev` mit einer klaren Allowlist hinzu.
- Erstellen Sie APK/AAB über GitHub Actions bei Tag-Pushes.
- Bewahren Sie versionierte Release Notes im Repository auf.

## 5. Vorgeschlagene Upgrade-Ideen

### Kurzfristig

- Beheben Sie alle fehlenden Übersetzungsschlüssel: `common.warning`, `createWallet.vanityLongTitle`.
- Bereinigen Sie verbleibende englische Strings in anderen Locales.
- Fügen Sie der CI ein i18n-Prüfskript hinzu.
- Aktualisieren Sie Vite, um das aktuelle Advisory zu lösen.
- Fügen Sie eine "Sicherheitsstatus"-Seite in den Einstellungen hinzu.
- Fügen Sie einen klaren Hinweis hinzu, dass das automatische Löschen der Zwischenablage ein Best-Effort-Ansatz ist.
- Fügen Sie eine Schaltfläche "Im Explorer öffnen" nach Netzwerk im Guthabenbearbeitungs-Modal hinzu.
- Fügen Sie Undo-Snackbars für Wallet-Löschung, Guthabenbearbeitung und Ordneränderungen hinzu.

### Mittelfristig

- Migrieren Sie das Verschlüsselungsformat zu versioniertem WebCrypto AES-GCM.
- Trennen Sie Android Secure Mode und Compatibility Mode.
- Fügen Sie Playwright Smoke-Tests für Hauptabläufe hinzu.
- Lazy Load für Scanner/Analysen/Erweiterte Tools, um die anfängliche Bundle-Größe zu reduzieren.
- Fügen Sie Export/Import von Einstellungen hinzu, die sensible Daten ausschließen.
- Fügen Sie einen "Tresor-Audit"-Modus hinzu: Wallets ohne Backups, doppelte Adressen, fehlende Netzwerke, fehlende Namen oder private Schlüssel, die nicht mit Adressen übereinstimmen.

### Langfristig

- Erstellen Sie einen offiziellen Wiederherstellungsleitfaden für Szenarien wie Gerätewechsel, Änderung der Bildschirmsperre, Verlust von Biometrie oder Verlust von `.xkey`-Dateien.
- Fügen Sie verschlüsselten Mehrgeräte-Transfer über mehrteilige QR-Codes oder temporäre Dateien hinzu.
- Fügen Sie eine Option "Nur Hardware-gestützt" für Benutzer mit hohen Sicherheitsanforderungen hinzu.
- Fügen Sie Adressvalidierung über Checksumme/Netzwerk hinzu.
- Stellen Sie Papier-Backup-Vorlagen bereit: Adresse, Netzwerk, Notizen, ohne private Schlüssel, falls vom Benutzer gewählt.
- Bessere Desktop-/PWA-Unterstützung für die Verwendung von xKey als Desktop-Offline-Tresor.

## 6. Zukünftige Produktrichtung

xKey sollte den Weg eines "professionellen Offline-Tresors für Benutzer mit vielen Wallets" verfolgen. Es sollte nicht vorzeitig in eine Online-Transaktions-Wallet umgewandelt werden, da dies Sicherheitsrisiken, RPC-Abhängigkeiten, Phishing-Vektoren, Transaktionssignierungshaftungen und Angriffsflächen erhöht.

Geeignete Richtung:
1. Datensicherheit priorisieren: Backup, Wiederherstellung, Migration, klare Warnungen, Tresor-Auditierung.
2. Schnelle Verwaltung vieler Wallets priorisieren: Ordner, Tags, Filter, Batch-Bearbeitungen, CSV, QR, Vanity-Generierung.
3. Stabile Android-native Funktionen priorisieren: Device Credential, Keystore, Verwaltung der Zwischenablage, Dateiauswahl, QR-Teilen/-Download.
4. Dichte, aber klare Benutzeroberfläche priorisieren: Skalierung, Kompaktmodus, responsive Tablet-Layouts, kurze Toasts, nicht blockierende Modale.
5. Transparenz priorisieren: Sicherheitsstatus, Release Notes, explizite Versionierung in der App, Backup- und Wipe-Leitfäden.

## 7. Fazi

Das Projekt hat eine solide Basis: funktionsreich, klarer Offline-First-Ansatz, Android Credential-Integration ist auf dem richtigen Weg, die Benutzeroberfläche ist stark für Mobilgeräte/Tablets optimiert und es bietet ein umfassendes Toolset für die Wallet-Verwaltung.

Die obersten Prioritäten für die Zukunft sind nicht das Hinzufügen zahlreicher neuer Funktionen, sondern die App "schwerer kaputt zu machen":
- Vervollständigen Sie die i18n-Implementierung.
- Härten Sie das Android-Release.
- Klären Sie das Sicherheitsmodell von Keystore/Fallback.
- Fügen Sie automatisierte Tests für kritische Abläufe hinzu.
- Verwalten Sie Abhängigkeitsprüfungen.
- Standardisieren Sie das Verschlüsselungsformat langfristig.

Wenn diese Punkte gut angegangen werden, kann xKey zu einem äußerst zuverlässigen Offline-Tresor-Tool für Benutzer wachsen, die mehrere Web3-Wallets verwalten.
