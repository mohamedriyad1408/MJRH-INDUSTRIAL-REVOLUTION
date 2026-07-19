const fs = require('fs');
const path = require('path');

const languages = ['ar', 'en', 'fr', 'it', 'es', 'de', 'zh', 'ja', 'pt'];

const data = {
  common: {
    ar: { "language": "اللغة", "loading": "جاري التحميل", "save": "حفظ", "open": "فتح", "back": "عودة", "egp": "ج.م", "total": "الإجمالي" },
    en: { "language": "Language", "loading": "Loading", "save": "Save", "open": "Open", "back": "Back", "egp": "EGP", "total": "Total" },
    fr: { "language": "Langue", "loading": "Chargement", "save": "Enregistrer", "open": "Ouvrir", "back": "Retour", "egp": "EGP", "total": "Total" },
    it: { "language": "Lingua", "loading": "Caricamento", "save": "Salva", "open": "Apri", "back": "Indietro", "egp": "EGP", "total": "Totale" },
    es: { "language": "Idioma", "loading": "Cargando", "save": "Guardar", "open": "Abrir", "back": "Volver", "egp": "EGP", "total": "Total" },
    de: { "language": "Sprache", "loading": "Laden", "save": "Speichern", "open": "Öffnen", "back": "Zurück", "egp": "EGP", "total": "Gesamt" },
    zh: { "language": "语言", "loading": "加载中", "save": "保存", "open": "打开", "back": "返回", "egp": "EGP", "total": "总计" },
    ja: { "language": "言語", "loading": "読み込み中", "save": "保存", "open": "開く", "back": "戻る", "egp": "EGP", "total": "合計" },
    pt: { "language": "Idioma", "loading": "Carregando", "save": "Salvar", "open": "Abrir", "back": "Voltar", "egp": "EGP", "total": "Total" }
  },
  navigation: {
    ar: { "main": "الرئيسية", "today": "مركز اليوم", "dashboard": "لوحة المالك", "orders": "كل العمليات", "customers": "العملاء", "staff": "الموظفون", "finance": "المالية", "settings": "الإعدادات" },
    en: { "main": "Main", "today": "Today Center", "dashboard": "Owner Dashboard", "orders": "All Orders", "customers": "Customers", "staff": "Staff", "finance": "Finance", "settings": "Settings" },
    fr: { "main": "Accueil", "today": "Centre du jour", "dashboard": "Tableau de bord", "orders": "Commandes", "customers": "Clients", "staff": "Personnel", "finance": "Finances", "settings": "Paramètres" },
    it: { "main": "Home", "today": "Centro oggi", "dashboard": "Dashboard", "orders": "Ordini", "customers": "Clienti", "staff": "Personale", "finance": "Finanza", "settings": "Impostazioni" },
    es: { "main": "Inicio", "today": "Centro de hoy", "dashboard": "Panel de control", "orders": "Pedidos", "customers": "Clientes", "staff": "Personal", "finance": "Finanzas", "settings": "Configuración" },
    de: { "main": "Startseite", "today": "Tageszentrum", "dashboard": "Dashboard", "orders": "Bestellungen", "customers": "Kunden", "staff": "Personal", "finance": "Finanzen", "settings": "Einstellungen" },
    zh: { "main": "主页", "today": "今日中心", "dashboard": "仪表板", "orders": "订单", "customers": "客户", "staff": "员工", "finance": "财务", "settings": "设置" },
    ja: { "main": "ホーム", "today": "今日センター", "dashboard": "ダッシュボード", "orders": "注文", "customers": "顧客", "staff": "スタッフ", "finance": "財務", "settings": "設定" },
    pt: { "main": "Início", "today": "Centro de hoje", "dashboard": "Painel", "orders": "Pedidos", "customers": "Clientes", "staff": "Equipe", "finance": "Finanças", "settings": "Configurações" }
  }
};

Object.keys(data).forEach(domain => {
  languages.forEach(lang => {
    const dir = path.join('src', 'locales', lang);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${domain}.json`), JSON.stringify(data[domain][lang], null, 2));
  });
});

console.log('✅ Generated 9-language JSON files.');
