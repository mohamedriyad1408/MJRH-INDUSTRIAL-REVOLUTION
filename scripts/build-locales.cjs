const fs = require('fs');

const domains = ['common', 'navigation', 'customer', 'catalog', 'staff', 'accounting', 'operations', 'errors'];
const extracted = JSON.parse(fs.readFileSync('extracted-strings.json', 'utf8'));

const ar = {};
domains.forEach(d => ar[d] = {});

Object.values(extracted).forEach(strings => {
    strings.forEach(str => {
        // Create a safe key
        const key = str.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '_').slice(0, 40).replace(/_+$/g, '');
        if (key && !ar.common[key]) {
            ar.common[key] = str;
        }
    });
});

domains.forEach(d => {
    fs.mkdirSync(`src/locales/ar`, { recursive: true });
    fs.mkdirSync(`src/locales/en`, { recursive: true });
    fs.writeFileSync(`src/locales/ar/${d}.json`, JSON.stringify(ar[d], null, 2));
    fs.writeFileSync(`src/locales/en/${d}.json`, JSON.stringify({}, null, 2));
});

console.log('✅ Created JSON locale files in src/locales/ar/*.json');
