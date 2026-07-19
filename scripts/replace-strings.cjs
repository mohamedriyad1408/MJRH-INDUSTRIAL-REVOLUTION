const fs = require('fs');
const path = require('path');

const arCommon = JSON.parse(fs.readFileSync('src/locales/ar/common.json', 'utf8'));
const folders = ['src', 'routes', 'components'];

const reverseMap = {};
Object.keys(arCommon).forEach(key => {
    reverseMap[arCommon[key]] = key;
});

// Sort by length descending to replace longer strings first (prevents partial replacement)
const texts = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

function processFile(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'locales' && file !== 'node_modules') processFile(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            texts.forEach(text => {
                const key = reverseMap[text];
                // Replace "text" with {t("common.key")} for JSX
                // and "text" with t("common.key") for normal JS strings
                // This is a simplified safe approach
                const dq = `"${text}"`;
                const sq = `'${text}'`;
                
                if (content.includes(dq) || content.includes(sq)) {
                    // Check if inside JSX attribute or tag
                    // For now, we will replace and let tsc find syntax issues
                    // This logic is safer: it checks for quotes
                    const regexDQ = new RegExp(`"${text}"`, 'g');
                    const regexSQ = new RegExp(`'${text}'`, 'g');
                    
                    content = content.replace(regexDQ, `t("common.${key}")`);
                    content = content.replace(regexSQ, `t("common.${key}")`);
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

folders.forEach(f => {
    if (fs.existsSync(f)) processFile(f);
});
