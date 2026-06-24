import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const translations = {
  en: {
    vanityStorage: 'Storage',
    vanityPerformanceSafety: 'Performance & safety',
    vanitySpeedMeasuring: 'Measuring...',
    vanityEstimatedTime: 'Estimated time',
    vanityScanProgress: 'Scan progress',
    vanityThreadsBatch: 'Threads / batch',
    vanityMode: 'Mode',
    vanityChunk: 'Chunk {chunk}',
    vanityPrimary: 'Primary {current}/{total}',
    vanityExtra: 'Extra {current}/{total}',
  },
  vi: {
    vanityStorage: 'Lưu trữ',
    vanityPerformanceSafety: 'Hiệu năng & an toàn',
    vanitySpeedMeasuring: 'Đang đo...',
    vanityEstimatedTime: 'Thời gian ước tính',
    vanityScanProgress: 'Tiến độ quét',
    vanityThreadsBatch: 'Luồng / lô',
    vanityMode: 'Chế độ',
    vanityChunk: 'Lô {chunk}',
    vanityPrimary: 'Chính {current}/{total}',
    vanityExtra: 'Phụ {current}/{total}',
  },
  zh: {
    vanityStorage: '存储',
    vanityPerformanceSafety: '性能与安全',
    vanitySpeedMeasuring: '测量中...',
    vanityEstimatedTime: '预计时间',
    vanityScanProgress: '扫描进度',
    vanityThreadsBatch: '线程 / 批次',
    vanityMode: '模式',
    vanityChunk: '批次 {chunk}',
    vanityPrimary: '主要 {current}/{total}',
    vanityExtra: '额外 {current}/{total}',
  },
  es: {
    vanityStorage: 'Almacenamiento',
    vanityPerformanceSafety: 'Rendimiento y seguridad',
    vanitySpeedMeasuring: 'Midiendo...',
    vanityEstimatedTime: 'Tiempo estimado',
    vanityScanProgress: 'Progreso de escaneo',
    vanityThreadsBatch: 'Hilos / lote',
    vanityMode: 'Modo',
    vanityChunk: 'Lote {chunk}',
    vanityPrimary: 'Principal {current}/{total}',
    vanityExtra: 'Extra {current}/{total}',
  },
  fr: {
    vanityStorage: 'Stockage',
    vanityPerformanceSafety: 'Performance et sécurité',
    vanitySpeedMeasuring: 'Mesure...',
    vanityEstimatedTime: 'Temps estimé',
    vanityScanProgress: 'Progression du scan',
    vanityThreadsBatch: 'Threads / lot',
    vanityMode: 'Mode',
    vanityChunk: 'Lot {chunk}',
    vanityPrimary: 'Principal {current}/{total}',
    vanityExtra: 'Extra {current}/{total}',
  },
  de: {
    vanityStorage: 'Speicher',
    vanityPerformanceSafety: 'Leistung & Sicherheit',
    vanitySpeedMeasuring: 'Wird gemessen...',
    vanityEstimatedTime: 'Geschätzte Zeit',
    vanityScanProgress: 'Scan-Fortschritt',
    vanityThreadsBatch: 'Threads / Batch',
    vanityMode: 'Modus',
    vanityChunk: 'Batch {chunk}',
    vanityPrimary: 'Primär {current}/{total}',
    vanityExtra: 'Extra {current}/{total}',
  },
  pt: {
    vanityStorage: 'Armazenamento',
    vanityPerformanceSafety: 'Desempenho e segurança',
    vanitySpeedMeasuring: 'Medindo...',
    vanityEstimatedTime: 'Tempo estimado',
    vanityScanProgress: 'Progresso da varredura',
    vanityThreadsBatch: 'Threads / lote',
    vanityMode: 'Modo',
    vanityChunk: 'Lote {chunk}',
    vanityPrimary: 'Principal {current}/{total}',
    vanityExtra: 'Extra {current}/{total}',
  },
  id: {
    vanityStorage: 'Penyimpanan',
    vanityPerformanceSafety: 'Performa & keamanan',
    vanitySpeedMeasuring: 'Mengukur...',
    vanityEstimatedTime: 'Estimasi waktu',
    vanityScanProgress: 'Progres pemindaian',
    vanityThreadsBatch: 'Thread / batch',
    vanityMode: 'Mode',
    vanityChunk: 'Batch {chunk}',
    vanityPrimary: 'Utama {current}/{total}',
    vanityExtra: 'Ekstra {current}/{total}',
  },
  hi: {
    vanityStorage: 'स्टोरेज',
    vanityPerformanceSafety: 'प्रदर्शन और सुरक्षा',
    vanitySpeedMeasuring: 'माप रहा है...',
    vanityEstimatedTime: 'अनुमानित समय',
    vanityScanProgress: 'स्कैन प्रगति',
    vanityThreadsBatch: 'थ्रेड / बैच',
    vanityMode: 'मोड',
    vanityChunk: 'बैच {chunk}',
    vanityPrimary: 'मुख्य {current}/{total}',
    vanityExtra: 'अतिरिक्त {current}/{total}',
  },
  ar: {
    vanityStorage: 'التخزين',
    vanityPerformanceSafety: 'الأداء والسلامة',
    vanitySpeedMeasuring: 'جارٍ القياس...',
    vanityEstimatedTime: 'الوقت المقدر',
    vanityScanProgress: 'تقدم الفحص',
    vanityThreadsBatch: 'الخيوط / الدفعة',
    vanityMode: 'الوضع',
    vanityChunk: 'دفعة {chunk}',
    vanityPrimary: 'رئيسي {current}/{total}',
    vanityExtra: 'إضافي {current}/{total}',
  },
  ja: {
    vanityStorage: '保存先',
    vanityPerformanceSafety: '性能と安全',
    vanitySpeedMeasuring: '測定中...',
    vanityEstimatedTime: '推定時間',
    vanityScanProgress: 'スキャン進捗',
    vanityThreadsBatch: 'スレッド / バッチ',
    vanityMode: 'モード',
    vanityChunk: 'バッチ {chunk}',
    vanityPrimary: 'メイン {current}/{total}',
    vanityExtra: '追加 {current}/{total}',
  },
  ko: {
    vanityStorage: '저장소',
    vanityPerformanceSafety: '성능 및 안전',
    vanitySpeedMeasuring: '측정 중...',
    vanityEstimatedTime: '예상 시간',
    vanityScanProgress: '스캔 진행률',
    vanityThreadsBatch: '스레드 / 배치',
    vanityMode: '모드',
    vanityChunk: '배치 {chunk}',
    vanityPrimary: '기본 {current}/{total}',
    vanityExtra: '추가 {current}/{total}',
  },
  th: {
    vanityStorage: 'พื้นที่จัดเก็บ',
    vanityPerformanceSafety: 'ประสิทธิภาพและความปลอดภัย',
    vanitySpeedMeasuring: 'กำลังวัด...',
    vanityEstimatedTime: 'เวลาโดยประมาณ',
    vanityScanProgress: 'ความคืบหน้าการสแกน',
    vanityThreadsBatch: 'เธรด / แบทช์',
    vanityMode: 'โหมด',
    vanityChunk: 'แบทช์ {chunk}',
    vanityPrimary: 'หลัก {current}/{total}',
    vanityExtra: 'เพิ่มเติม {current}/{total}',
  },
  ru: {
    vanityStorage: 'Хранилище',
    vanityPerformanceSafety: 'Производительность и безопасность',
    vanitySpeedMeasuring: 'Измерение...',
    vanityEstimatedTime: 'Расчетное время',
    vanityScanProgress: 'Прогресс сканирования',
    vanityThreadsBatch: 'Потоки / пакет',
    vanityMode: 'Режим',
    vanityChunk: 'Пакет {chunk}',
    vanityPrimary: 'Основные {current}/{total}',
    vanityExtra: 'Доп. {current}/{total}',
  },
  tr: {
    vanityStorage: 'Depolama',
    vanityPerformanceSafety: 'Performans ve güvenlik',
    vanitySpeedMeasuring: 'Ölçülüyor...',
    vanityEstimatedTime: 'Tahmini süre',
    vanityScanProgress: 'Tarama ilerlemesi',
    vanityThreadsBatch: 'İş parçacığı / parti',
    vanityMode: 'Mod',
    vanityChunk: 'Parti {chunk}',
    vanityPrimary: 'Birincil {current}/{total}',
    vanityExtra: 'Ek {current}/{total}',
  },
};

const order = [
  'vanityStorage',
  'vanityPerformanceSafety',
  'vanitySpeedMeasuring',
  'vanityEstimatedTime',
  'vanityScanProgress',
  'vanityThreadsBatch',
  'vanityMode',
  'vanityChunk',
  'vanityPrimary',
  'vanityExtra',
];

const localeDir = 'src/locales';
for (const file of readdirSync(localeDir).filter((name) => name.endsWith('.ts'))) {
  const code = file.replace(/\.ts$/, '');
  const values = translations[code] ?? translations.en;
  const filePath = join(localeDir, file);
  let text = readFileSync(filePath, 'utf8');

  for (const key of order) {
    const line = `    "${key}": "${values[key]}",`;
    const re = new RegExp(`^\\s*"${key}":\\s*".*?",\\r?\\n`, 'm');
    if (re.test(text)) {
      text = text.replace(re, `${line}\n`);
    } else {
      text = text.replace('    "vanitySpeed": ', `${line}\n    "vanitySpeed": `);
    }
  }

  writeFileSync(filePath, text, 'utf8');
}