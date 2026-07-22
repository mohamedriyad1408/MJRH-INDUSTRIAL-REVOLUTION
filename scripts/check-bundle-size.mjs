import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const assetsDir = path.join("dist", "assets");
const maxRawKb = 750; // Reverted to 750KB since code splitting resolved the issue
const maxGzipKb = Number(process.env.MAX_JS_GZIP_KB ?? 170);
const maxCssKb = Number(process.env.MAX_CSS_KB ?? 130);

if (!fs.existsSync(assetsDir)) {
  console.error("dist/assets does not exist. Run npm run build first.");
  process.exit(1);
}

const failures = [];
const rows = [];
for (const file of fs.readdirSync(assetsDir)) {
  const full = path.join(assetsDir, file);
  const size = fs.statSync(full).size;
  const gzip = zlib.gzipSync(fs.readFileSync(full)).length;
  const rawKb = size / 1024;
  const gzipKb = gzip / 1024;
  if (file.endsWith(".js")) {
    rows.push({ file, rawKb, gzipKb });
    if (rawKb > maxRawKb) failures.push(`${file}: ${rawKb.toFixed(1)}KB raw > ${maxRawKb}KB`);
    if (gzipKb > maxGzipKb) failures.push(`${file}: ${gzipKb.toFixed(1)}KB gzip > ${maxGzipKb}KB`);
  }
  if (file.endsWith(".css") && rawKb > maxCssKb) failures.push(`${file}: ${rawKb.toFixed(1)}KB css > ${maxCssKb}KB`);
}

rows.sort((a, b) => b.rawKb - a.rawKb);
console.log("Largest JS chunks:");
for (const r of rows.slice(0, 12)) console.log(`- ${r.file}: ${r.rawKb.toFixed(1)}KB raw / ${r.gzipKb.toFixed(1)}KB gzip`);

if (failures.length) {
  console.error("Bundle budget failed:");
  for (const f of failures) console.error(`ERROR: ${f}`);
  process.exit(1);
}
console.log("Bundle budget passed.");
