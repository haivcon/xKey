const fs = require("fs");
const path = require("path");

const localeDir = path.join("src", "locales");
const keys = [
  "stepsTitle",
  "step1",
  "step2",
  "step3",
  "securityNote",
  "scanGuideTitle",
  "scanStep1",
  "scanStep2",
  "scanStep3",
];

let ok = true;

for (const fileName of fs.readdirSync(localeDir).filter((file) => file.endsWith(".ts") && file !== "index.ts")) {
  const source = fs.readFileSync(path.join(localeDir, fileName), "utf8");
  const missing = keys.filter((key) => !source.includes(`"${key}"`));

  if (missing.length > 0) {
    ok = false;
    console.log(`${fileName} missing ${missing.join(",")}`);
  }
}

if (!ok) {
  process.exit(1);
}

console.log("All locale QR transfer keys present.");