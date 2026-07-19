const fs = require('fs');
const path = require('path');

const arCommon = JSON.parse(fs.readFileSync('src/locales/ar/common.json', 'utf8'));
const folders = ['src', 'routes', 'components'];

const keyToText = {};
Object.keys(arCommon).forEach(key => {
    keyToText[key] = arCommon[key];
});

function processFile(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'locales' && file !== 'node_modules') processFile(fullPath);
        } else {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            if (file.endsWith('.tsx')) {
                // Rule 1: Fix JSX Attributes
                const attributes = ['label', 'placeholder', 'title', 'aria-label', 'alt', 'name', 'description', 'help'];
                attributes.forEach(attr => {
                    const regex = new RegExp(`${attr}=t\\("common\\.`, 'g');
                    if (regex.test(content)) {
                        console.log(`🔧 Fixing JSX attribute [${attr}] in: ${fullPath}`);
                        // Find the whole t("common.xxx") and wrap it
                        // This regex looks for attr=t("common.KEY") and changes to attr={t("common.KEY")}
                        const replaceRegex = new RegExp(`(${attr})=t\\("common\\.([a-zA-Z0-9_]+)"\\)`, 'g');
                        content = content.replace(replaceRegex, '$1={t("common.$2")}');
                        changed = true;
                    }
                });
            }

            if (file.endsWith('.ts')) {
                // Rule 2: Revert Logic Files
                if (content.includes('import { useI18n }') || content.includes('t("common.')) {
                    console.log(`⏪ Reverting logic file: ${fullPath}`);
                    
                    // Remove hook setup
                    content = content.replace(/import\s+{\s*useI18n\s*}\s+from\s+['"]@\/lib\/i18n['"];?\n?/g, '');
                    content = content.replace(/\n?\s*const\s+{\s*t\s*}\s*=\s*useI18n\(\);?/g, '');
                    
                    // Restore Arabic text
                    Object.keys(keyToText).forEach(key => {
                        const tCall = `t("common.${key}")`;
                        if (content.includes(tCall)) {
                            content = content.replace(new RegExp(`t\\("common\\.${key}"\\)`, 'g'), `"${keyToText[key]}"`);
                        }
                    });
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

folders.forEach(f => {
    if (fs.existsSync(f)) processFile(f);
});
