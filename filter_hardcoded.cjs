const fs = require('fs');
const files = fs.readFileSync('raw_arabic_files.txt', 'utf8').split('\n').filter(Boolean);
const results = [];

const arabicRegex = /[\u0600-\u06FF]/;
const translatedRegex = /t\s*\(\s*['"`][^'"`]*[\u0600-\u06FF]/; // Rough check for t("arabic")

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        let count = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('import')) return;
            if (arabicRegex.test(line) && !line.includes('t(')) {
                count++;
            }
        });
        if (count > 0) {
            results.push({ count, file });
        }
    } catch (e) {}
});

results.sort((a, b) => b.count - a.count);
results.forEach(r => console.log(`${r.count}: ${r.file}`));
