import fs from "node:fs";
import path from "node:path";

const errors = [];
const warnings = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "coverage", "test-results", "playwright-report"].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const file of walk(".")) {
  const rel = file.replace(/^\.\//, "");
  if (!/\.(ts|tsx|js|mjs|sql|md|json|env|toml|yml|yaml)$/i.test(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/.test(text)) errors.push(`${rel}: contains service role env assignment`);
  if (/ghp_[A-Za-z0-9_]{20,}/.test(text)) errors.push(`${rel}: contains GitHub token-like value`);
  if (/sbp_[A-Za-z0-9_]{20,}/.test(text)) errors.push(`${rel}: contains Supabase PAT-like value`);
  if (/postgresql:\/\/[^\s)"']+/.test(text)) errors.push(`${rel}: contains postgres connection string`);
  if (rel.endsWith(".sql") && /SECURITY DEFINER/i.test(text) && !/SET search_path\s*=\s*public/i.test(text)) warnings.push(`${rel}: SECURITY DEFINER without explicit public search_path`);
}

if (fs.existsSync(".env.production")) {
  const env = fs.readFileSync(".env.production", "utf8");
  if (/SERVICE_ROLE|DATABASE_URL|SUPABASE_ACCESS_TOKEN|ghp_|sbp_/i.test(env)) errors.push(".env.production contains sensitive secret-like key");
  else warnings.push(".env.production is tracked for current Vercel compatibility; move values to Vercel env vars when safe.");
}

for (const w of warnings) console.warn(`WARN: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log("Repo guard passed.");
