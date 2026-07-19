const fs = require('fs');
const path = require('path');

const arCommon = JSON.parse(fs.readFileSync('src/locales/ar/common.json', 'utf8'));
const reverseMap = {};
Object.keys(arCommon).forEach(key => {
    reverseMap[arCommon[key]] = key;
});
const texts = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

const coreFiles = [
    'components/app-sidebar.tsx',
    'routes/$tenant.tsx',
    'routes/_admin.tsx',
    'routes/__root.tsx'
];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        texts.forEach(text => {
            const key = reverseMap[text];
            const escapedText = escapeRegExp(text);
            const dqRegex = new RegExp(`"${escapedText}"`, 'g');
            const sqRegex = new RegExp(`'${escapedText}'`, 'g');
            // For core files, we wrap with {} if likely in JSX
            content = content.replace(dqRegex, `{t("common.${key}")}`);
            content = content.replace(sqRegex, `{t("common.${key}")}`);
        });
        
        // Inject Hook if missing
        if (!content.includes('import { useI18n }')) {
            content = `import { useI18n } from "@/lib/i18n";\n` + content;
        }
        if (!content.includes('const { t } =')) {
            const funcRegex = /(export\s+)?(function|const)\s+[A-Z][a-zA-Z0-9]*\s*(\(|=).*?\{/;
            const match = content.match(funcRegex);
            if (match) {
                const insertPos = match.index + match[0].length;
                content = content.slice(0, insertPos) + `\n  const { t } = useI18n();` + content.slice(insertPos);
            }
        }
        fs.writeFileSync(file, content);
        console.log(`💎 Core file translated: ${file}`);
    }
});
