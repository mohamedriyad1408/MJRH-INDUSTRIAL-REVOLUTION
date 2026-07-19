const fs = require('fs');

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const arCommon = JSON.parse(fs.readFileSync('src/locales/ar/common.json', 'utf8'));
const reverseMap = {};
Object.keys(arCommon).forEach(key => { reverseMap[arCommon[key]] = key; });
const texts = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

const coreFiles = ['components/app-sidebar.tsx', 'routes/$tenant.tsx', 'routes/_admin.tsx', 'routes/__root.tsx'];

coreFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    texts.forEach(text => {
        const key = reverseMap[text];
        const escaped = escapeRegExp(text);
        const dqRegex = new RegExp(`"${escaped}"`, 'g');
        const sqRegex = new RegExp(`'${escaped}'`, 'g');
        content = content.replace(dqRegex, `t("common.${key}")`);
        content = content.replace(sqRegex, `t("common.${key}")`);
    });

    // Handle imports and hook
    if (!content.includes('import { useI18n }')) {
        content = `import { useI18n } from "@/lib/i18n";\n` + content;
    }
    
    // Simple hook injection at the beginning of the component
    if (!content.includes('const { t } =')) {
        const componentName = file === 'components/app-sidebar.tsx' ? 'AppSidebar' : 
                            file === 'routes/$tenant.tsx' ? 'AppLayout' :
                            file === 'routes/_admin.tsx' ? 'AdminLayout' : 'Root';
        
        // Find function definition and inject
        const search = new RegExp(`function\\s+${componentName}\\(\\)\\s*{`);
        content = content.replace(search, `$& \n  const { t } = useI18n();`);
    }
    
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed ${file}`);
});
