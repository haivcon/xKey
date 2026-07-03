const fs = require('fs');
const path = require('path');

const translations = {
  en: {
    walletCard: { qrTransferWallet: 'Transfer via QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'On the receiving device',
      scanStep1: 'Tap the camera button near search on the home screen.',
      scanStep2: 'Scan each QR part until the progress reaches 100%.',
      scanStep3: 'Save into the selected folder or the QR folder created by xKey.',
    },
  },
  vi: {
    walletCard: { qrTransferWallet: 'Chuyển qua QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'Trên thiết bị nhận',
      scanStep1: 'Nhấn nút camera gần ô tìm kiếm ở trang chủ.',
      scanStep2: 'Quét từng phần QR cho đến khi tiến trình đạt 100%.',
      scanStep3: 'Lưu vào thư mục đã chọn hoặc thư mục QR do xKey tạo.',
    },
  },
  zh: {
    walletCard: { qrTransferWallet: '通过 QR 传输', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: '在接收设备上',
      scanStep1: '在主页点击搜索框旁边的相机按钮。',
      scanStep2: '按顺序扫描每个 QR 分片，直到进度达到 100%。',
      scanStep3: '保存到所选文件夹，或保存到 xKey 创建的 QR 文件夹。',
    },
  },
  id: {
    walletCard: { qrTransferWallet: 'Transfer via QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'Di perangkat penerima',
      scanStep1: 'Ketuk tombol kamera di dekat kolom pencarian pada layar utama.',
      scanStep2: 'Pindai setiap bagian QR hingga progres mencapai 100%.',
      scanStep3: 'Simpan ke folder yang dipilih atau folder QR yang dibuat oleh xKey.',
    },
  },
  ru: {
    walletCard: { qrTransferWallet: 'Передать через QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'На принимающем устройстве',
      scanStep1: 'Нажмите кнопку камеры рядом с поиском на главном экране.',
      scanStep2: 'Сканируйте каждую часть QR, пока прогресс не достигнет 100%.',
      scanStep3: 'Сохраните в выбранную папку или в папку QR, созданную xKey.',
    },
  },
  ko: {
    walletCard: { qrTransferWallet: 'QR로 전송', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: '받는 기기에서',
      scanStep1: '홈 화면의 검색창 근처에 있는 카메라 버튼을 누르세요.',
      scanStep2: '진행률이 100%가 될 때까지 각 QR 조각을 스캔하세요.',
      scanStep3: '선택한 폴더 또는 xKey가 만든 QR 폴더에 저장하세요.',
    },
  },
  es: {
    walletCard: { qrTransferWallet: 'Transferir por QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'En el dispositivo receptor',
      scanStep1: 'Toca el botón de cámara junto a la búsqueda en la pantalla principal.',
      scanStep2: 'Escanea cada parte del QR hasta que el progreso llegue al 100%.',
      scanStep3: 'Guarda en la carpeta seleccionada o en la carpeta QR creada por xKey.',
    },
  },
  hi: {
    walletCard: { qrTransferWallet: 'QR से ट्रांसफ़र करें', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'प्राप्त करने वाले डिवाइस पर',
      scanStep1: 'होम स्क्रीन पर खोज के पास कैमरा बटन टैप करें।',
      scanStep2: 'प्रगति 100% होने तक प्रत्येक QR भाग स्कैन करें।',
      scanStep3: 'चुने गए फ़ोल्डर या xKey द्वारा बनाए गए QR फ़ोल्डर में सहेजें।',
    },
  },
  th: {
    walletCard: { qrTransferWallet: 'โอนผ่าน QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'บนอุปกรณ์รับ',
      scanStep1: 'แตะปุ่มกล้องใกล้ช่องค้นหาบนหน้าหลัก',
      scanStep2: 'สแกน QR แต่ละส่วนจนกว่าความคืบหน้าจะถึง 100%',
      scanStep3: 'บันทึกลงในโฟลเดอร์ที่เลือกหรือโฟลเดอร์ QR ที่ xKey สร้าง',
    },
  },
  de: {
    walletCard: { qrTransferWallet: 'Per QR übertragen', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'Auf dem empfangenden Gerät',
      scanStep1: 'Tippe auf dem Startbildschirm auf die Kamerataste neben der Suche.',
      scanStep2: 'Scanne jeden QR-Teil, bis der Fortschritt 100% erreicht.',
      scanStep3: 'Speichere in den ausgewählten Ordner oder in den von xKey erstellten QR-Ordner.',
    },
  },
  pt: {
    walletCard: { qrTransferWallet: 'Transferir por QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'No dispositivo receptor',
      scanStep1: 'Toque no botão da câmera perto da busca na tela inicial.',
      scanStep2: 'Escaneie cada parte do QR até o progresso chegar a 100%.',
      scanStep3: 'Salve na pasta selecionada ou na pasta QR criada pelo xKey.',
    },
  },
  ja: {
    walletCard: { qrTransferWallet: 'QRで転送', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: '受信側のデバイスで',
      scanStep1: 'ホーム画面で検索欄の近くにあるカメラボタンをタップします。',
      scanStep2: '進捗が100%になるまで、各QRパートをスキャンします。',
      scanStep3: '選択したフォルダー、またはxKeyが作成したQRフォルダーに保存します。',
    },
  },
  tr: {
    walletCard: { qrTransferWallet: 'QR ile aktar', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'Alıcı cihazda',
      scanStep1: 'Ana ekranda aramanın yanındaki kamera düğmesine dokunun.',
      scanStep2: 'İlerleme %100 olana kadar her QR parçasını tarayın.',
      scanStep3: 'Seçilen klasöre veya xKey tarafından oluşturulan QR klasörüne kaydedin.',
    },
  },
  ar: {
    walletCard: { qrTransferWallet: 'النقل عبر QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: 'على الجهاز المستقبِل',
      scanStep1: 'اضغط زر الكاميرا بجانب البحث في الشاشة الرئيسية.',
      scanStep2: 'امسح كل جزء من QR حتى يصل التقدم إلى 100%.',
      scanStep3: 'احفظ في المجلد المحدد أو في مجلد QR الذي ينشئه xKey.',
    },
  },
  fr: {
    walletCard: { qrTransferWallet: 'Transférer par QR', qrShort: 'QR' },
    qrTransfer: {
      scanGuideTitle: "Sur l'appareil récepteur",
      scanStep1: "Touchez le bouton caméra près de la recherche sur l'écran d'accueil.",
      scanStep2: "Scannez chaque partie du QR jusqu'à ce que la progression atteigne 100%.",
      scanStep3: 'Enregistrez dans le dossier choisi ou dans le dossier QR créé par xKey.',
    },
  },
};

function findObjectBounds(source, key) {
  const keyIndex = source.indexOf(`"${key}": {`);
  if (keyIndex === -1) return null;
  const open = source.indexOf('{', keyIndex);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start: open, end: i };
    }
  }
  return null;
}

function upsertStringInObject(source, objectKey, stringKey, value) {
  const bounds = findObjectBounds(source, objectKey);
  if (!bounds) throw new Error(`Missing object ${objectKey}`);

  const escapedValue = JSON.stringify(value);
  const objectText = source.slice(bounds.start, bounds.end + 1);
  const keyRegex = new RegExp(`"${stringKey}"\\s*:\\s*"[^"]*"`);
  let nextObjectText;

  if (keyRegex.test(objectText)) {
    nextObjectText = objectText.replace(keyRegex, `"${stringKey}": ${escapedValue}`);
  } else {
    const insertAt = objectText.lastIndexOf('}');
    const before = objectText.slice(0, insertAt).trimEnd();
    const needsComma = !before.endsWith('{') && !before.endsWith(',');
    nextObjectText = `${before}${needsComma ? ',' : ''}\n    "${stringKey}": ${escapedValue}\n  }`;
  }

  return source.slice(0, bounds.start) + nextObjectText + source.slice(bounds.end + 1);
}

const localesDir = path.join(process.cwd(), 'src', 'locales');

for (const [lang, data] of Object.entries(translations)) {
  const filePath = path.join(localesDir, `${lang}.ts`);
  let source = fs.readFileSync(filePath, 'utf8');

  for (const [key, value] of Object.entries(data.walletCard)) {
    source = upsertStringInObject(source, 'walletCard', key, value);
  }

  for (const [key, value] of Object.entries(data.qrTransfer)) {
    source = upsertStringInObject(source, 'qrTransfer', key, value);
  }

  fs.writeFileSync(filePath, source);
  console.log(`patched ${lang}.ts`);
}