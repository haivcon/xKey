const fs = require('fs');
const path = require('path');

const localesDir = path.join(process.cwd(), 'src/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find amoledMode pattern to insert after
  const amoledRegex = /("amoledMode":\s*"[^"]+",)/;
  
  if (amoledRegex.test(content) && !content.includes('"emeraldMode"')) {
    const translations = {
      'ar.ts': ['الوردة الوردية', 'الياقوت الأزرق', 'الياقوت الأحمر', 'الجمشت البنفسجي', 'الخزنة الزمردية'],
      'de.ts': ['Rosa Rose', 'Blauer Saphir', 'Roter Rubin', 'Violetter Amethyst', 'Smaragd-Tresor'],
      'en.ts': ['Pink Rose', 'Blue Sapphire', 'Red Ruby', 'Purple Amethyst', 'Emerald Vault'],
      'es.ts': ['Rosa rosada', 'Zafiro azul', 'Rubí rojo', 'Amatista púrpura', 'Bóveda esmeralda'],
      'fr.ts': ['Rose poudré', 'Saphir bleu', 'Rubis rouge', 'Améthyste violette', 'Coffre émeraude'],
      'hi.ts': ['गुलाबी गुलाब', 'नीला नीलम', 'लाल माणिक', 'बैंगनी अमेथिस्ट', 'पन्ना तिजोरी'],
      'id.ts': ['Mawar Merah Muda', 'Safir Biru', 'Rubi Merah', 'Ametis Ungu', 'Brankas Zamrud'],
      'ja.ts': ['ピンクローズ', 'ブルーサファイア', 'レッドルビー', 'パープルアメジスト', 'エメラルド金庫'],
      'ko.ts': ['핑크 장미', '블루 사파이어', '레드 루비', '퍼플 자수정', '에메랄드 금고'],
      'pt.ts': ['Rosa rosada', 'Safira azul', 'Rubi vermelho', 'Ametista roxa', 'Cofre esmeralda'],
      'ru.ts': ['Розовая роза', 'Синий сапфир', 'Красный рубин', 'Фиолетовый аметист', 'Изумрудное хранилище'],
      'th.ts': ['กุหลาบสีชมพู', 'ไพลินสีน้ำเงิน', 'ทับทิมสีแดง', 'อเมทิสต์สีม่วง', 'ห้องนิรภัยมรกต'],
      'tr.ts': ['Pembe Gül', 'Mavi Safir', 'Kırmızı Yakut', 'Mor Ametist', 'Zümrüt Kasası'],
      'vi.ts': ['Hồng Hoa Hồng', 'Xanh Lam Ngọc Bích', 'Đỏ Hồng Ngọc', 'Tím Thạch Anh', 'Kho Lục Bảo'],
      'zh.ts': ['粉红玫瑰', '蓝宝石', '红宝石', '紫水晶', '翡翠金库'],
    };
    const [pinkValue, blueValue, redValue, purpleValue, emeraldValue] = translations[file] || translations['en.ts'];
    const pink = `"pinkMode": ${JSON.stringify(pinkValue)},`;
    const blue = `"blueMode": ${JSON.stringify(blueValue)},`;
    const red = `"redMode": ${JSON.stringify(redValue)},`;
    const purple = `"purpleMode": ${JSON.stringify(purpleValue)},`;
    const emerald = `"emeraldMode": ${JSON.stringify(emeraldValue)},`;
    
    const replacement = `$1\n    ${pink}\n    ${blue}\n    ${red}\n    ${purple}\n    ${emerald}`;
    content = content.replace(amoledRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('Skipped ' + file);
  }
});
