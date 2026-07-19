const fs = require('fs');
const path = require('path');

const folders = ['src', 'routes', 'components', 'lib', 'hooks'];
const result = {};

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'locales' && file !== 'node_modules') walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            if (file.endsWith('.test.ts') || file.endsWith('.d.ts')) return;
            const content = fs.readFileSync(fullPath, 'utf8');
            // Match Arabic strings in double or single quotes
            const matches = content.match(/["']([\u0600-\u06FF][^"']*)["']/g);
            if (matches) {
                result[fullPath] = matches.map(m => m.slice(1, -1));
            }
        }
    });
}

folders.forEach(f => {
    if (fs.existsSync(f)) walk(f);
});

fs.writeFileSync('extracted-strings.json', JSON.stringify(result, null, 2));
console.log(`✅ Extracted strings from ${Object.keys(result).length} files.`);
