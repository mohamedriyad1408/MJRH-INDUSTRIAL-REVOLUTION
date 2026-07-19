const fs = require('fs');
const path = require('path');

const folders = ['src', 'routes', 'components'];

function processFile(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'locales' && file !== 'node_modules') processFile(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // If the file uses t() but doesn't define it
            if (content.includes('t("common.') && !content.includes('const { t } =')) {
                console.log(`💉 Injecting hook into: ${fullPath}`);
                
                // 1. Add import if missing
                if (!content.includes('import { useI18n }')) {
                    content = `import { useI18n } from "@/lib/i18n";\n` + content;
                }
                
                // 2. Inject const { t } = useI18n() inside the first function found
                // Looks for: export function Name() { OR function Name() { OR const Name = () => {
                const funcRegex = /(export\s+)?(function|const)\s+[A-Z][a-zA-Z0-9]*\s*(\(|=).*?\{/;
                const match = content.match(funcRegex);
                
                if (match) {
                    const insertPos = match.index + match[0].length;
                    content = content.slice(0, insertPos) + `\n  const { t } = useI18n();` + content.slice(insertPos);
                }
                
                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

folders.forEach(f => {
    if (fs.existsSync(f)) processFile(f);
});
console.log("✅ Injection finished.");
