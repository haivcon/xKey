const fs = require("fs");
const path = require("path");

const localeDir = path.join("src", "locales");

let changed = 0;

for (const fileName of fs.readdirSync(localeDir).filter((file) => file.endsWith(".ts") && file !== "index.ts")) {
  const filePath = path.join(localeDir, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  const next = source.replace(/\\r\\n/g, "\r\n");

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    changed += 1;
    console.log(`cleaned ${fileName}`);
  }
}

console.log(`Cleaned literal CRLF escapes in ${changed} locale file(s).`);