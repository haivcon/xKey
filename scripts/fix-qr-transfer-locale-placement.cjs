const fs = require("fs");
const path = require("path");

const localeDir = path.join("src", "locales");

const scanCopy = {
  en: {
    scanGuideTitle: "On the receiving device",
    scanStep1: "Tap the camera button near search on the home screen.",
    scanStep2: "Scan each QR part until the progress reaches 100%.",
    scanStep3: "Save into the selected folder or the QR folder created by xKey.",
  },
  vi: {
    scanGuideTitle: "Trên thiết bị nhận",
    scanStep1: "Nhấn nút camera gần ô tìm kiếm ở trang chủ.",
    scanStep2: "Quét từng phần QR cho đến khi tiến trình đạt 100%.",
    scanStep3: "Lưu vào thư mục đang chọn hoặc thư mục QR do xKey tạo.",
  },
};

const escapeTsString = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const scanBlockFor = (copy) =>
  [
    `    "scanGuideTitle": "${escapeTsString(copy.scanGuideTitle)}",`,
    `    "scanStep1": "${escapeTsString(copy.scanStep1)}",`,
    `    "scanStep2": "${escapeTsString(copy.scanStep2)}",`,
    `    "scanStep3": "${escapeTsString(copy.scanStep3)}"`,
  ].join("\r\n");

let failed = false;

for (const fileName of fs.readdirSync(localeDir).filter((file) => file.endsWith(".ts") && file !== "index.ts")) {
  const filePath = path.join(localeDir, fileName);
  const lang = fileName.replace(/\.ts$/, "");
  const copy = scanCopy[lang] || scanCopy.en;
  let source = fs.readFileSync(filePath, "utf8");

  source = source.replace(
    /(  "qrScanner": \{\r?\n    "title": "[^"]*",\r?\n    "hint": "([^"]*)"),\\r\\n    "scanGuideTitle": "[^"]*",\\r\\n    "scanStep1": "[^"]*",\\r\\n    "scanStep2": "[^"]*",\\r\\n    "scanStep3": "[^"]*",(\r?\n    "cameraDenied":)/,
    "$1,$3",
  );

  if (!source.includes('"qrTransfer"')) {
    console.error(`missing qrTransfer ${fileName}`);
    failed = true;
    continue;
  }

  if (!source.includes('"qrTransfer"') || !source.slice(source.indexOf('"qrTransfer"')).includes('"scanGuideTitle"')) {
    const next = source.replace(
      /(  "qrTransfer": \{[\s\S]*?    "hint": "[^"]*")(\r?\n  \},)/,
      (match, before, after) => `${before},\r\n${scanBlockFor(copy)}${after}`,
    );

    if (next === source) {
      console.error(`no qrTransfer hint match ${fileName}`);
      failed = true;
      continue;
    }

    source = next;
  }

  fs.writeFileSync(filePath, source);
  console.log(`fixed ${fileName}`);
}

if (failed) {
  process.exit(1);
}