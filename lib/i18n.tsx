import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LanguageCode = "ar" | "en" | "fr" | "it" | "es" | "de" | "zh" | "ja" | "pt";

export const SUPPORTED_LANGUAGES: { code: LanguageCode; nativeName: string; englishName: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr" },
  { code: "it", nativeName: "Italiano", englishName: "Italian", dir: "ltr" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr" },
  { code: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr" },
  { code: "zh", nativeName: "中文", englishName: "Chinese", dir: "ltr" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", dir: "ltr" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr" },
];

const dict: Record<LanguageCode, Record<string, string>> = {
  ar: {
    "common.language": "اللغة",
    "common.loading": "جاري التحميل",
    "common.save": "حفظ",
    "common.open": "فتح",
    "common.back": "عودة",
    "app.tagline": "نظام تشغيل ممتع ومنظم",
    "app.portal": "بوابة العميل",
    "app.signOut": "خروج",
    "login.heading": "نظام إدارة المغسلة",
    "login.signinTitle": "ادخل بياناتك للمتابعة",
    "login.signupTitle": "أنشئ حساب جديد",
    "login.forgotTitle": "استرجاع كلمة المرور",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة المرور",
    "login.fullName": "الاسم الكامل",
    "login.signIn": "دخول",
    "login.signUp": "إنشاء حساب",
    "login.sendLink": "إرسال الرابط",
    "login.forgotPassword": "نسيت كلمة المرور؟",
    "login.noAccount": "ليس عندك حساب؟ سجّل الآن",
    "login.backToSignin": "العودة لتسجيل الدخول",
    "login.firstAccountNote": "أول حساب يتسجّل في النظام يأخذ صلاحية مدير المنصة تلقائياً. باقي الحسابات تُفعَّل من الإدارة.",
    "login.backHome": "العودة للرئيسية",
    "waiting.title": "بانتظار التفعيل",
    "waiting.body": "تم إنشاء حسابك بنجاح. يجب على مالك المغسلة أو مدير المنصة تعيين دورك للوصول إلى النظام.",
  },
  en: {
    "common.language": "Language",
    "common.loading": "Loading",
    "common.save": "Save",
    "common.open": "Open",
    "common.back": "Back",
    "app.tagline": "A delightful, organized operating system",
    "app.portal": "Customer Portal",
    "app.signOut": "Sign out",
    "login.heading": "Laundry Management System",
    "login.signinTitle": "Enter your credentials to continue",
    "login.signupTitle": "Create a new account",
    "login.forgotTitle": "Recover your password",
    "login.email": "Email",
    "login.password": "Password",
    "login.fullName": "Full name",
    "login.signIn": "Sign in",
    "login.signUp": "Create account",
    "login.sendLink": "Send link",
    "login.forgotPassword": "Forgot password?",
    "login.noAccount": "No account? Sign up",
    "login.backToSignin": "Back to sign in",
    "login.firstAccountNote": "The first account registered becomes the platform admin. Other accounts must be activated by management.",
    "login.backHome": "Back to home",
    "waiting.title": "Pending activation",
    "waiting.body": "Your account was created. The laundry owner or platform admin must assign your role before you can access the system.",
  },
  fr: {
    "common.language": "Langue", "common.loading": "Chargement", "common.save": "Enregistrer", "common.open": "Ouvrir", "common.back": "Retour",
    "app.tagline": "Un système d’exploitation clair et agréable", "app.portal": "Portail client", "app.signOut": "Déconnexion",
    "login.heading": "Système de gestion de blanchisserie", "login.signinTitle": "Connectez-vous pour continuer", "login.signupTitle": "Créer un compte", "login.forgotTitle": "Récupérer le mot de passe", "login.email": "E-mail", "login.password": "Mot de passe", "login.fullName": "Nom complet", "login.signIn": "Connexion", "login.signUp": "Créer", "login.sendLink": "Envoyer le lien", "login.forgotPassword": "Mot de passe oublié ?", "login.noAccount": "Pas de compte ? Inscrivez-vous", "login.backToSignin": "Retour à la connexion", "login.firstAccountNote": "Le premier compte devient administrateur. Les autres comptes doivent être activés.", "login.backHome": "Accueil", "waiting.title": "Activation en attente", "waiting.body": "Votre compte doit recevoir un rôle avant l’accès au système."
  },
  it: {
    "common.language": "Lingua", "common.loading": "Caricamento", "common.save": "Salva", "common.open": "Apri", "common.back": "Indietro",
    "app.tagline": "Un sistema operativo organizzato e piacevole", "app.portal": "Portale cliente", "app.signOut": "Esci",
    "login.heading": "Sistema di gestione lavanderia", "login.signinTitle": "Inserisci le credenziali", "login.signupTitle": "Crea un account", "login.forgotTitle": "Recupera password", "login.email": "Email", "login.password": "Password", "login.fullName": "Nome completo", "login.signIn": "Accedi", "login.signUp": "Crea account", "login.sendLink": "Invia link", "login.forgotPassword": "Password dimenticata?", "login.noAccount": "Non hai un account? Registrati", "login.backToSignin": "Torna al login", "login.firstAccountNote": "Il primo account diventa amministratore. Gli altri devono essere attivati.", "login.backHome": "Home", "waiting.title": "In attesa di attivazione", "waiting.body": "Serve un ruolo assegnato prima di accedere al sistema."
  },
  es: {
    "common.language": "Idioma", "common.loading": "Cargando", "common.save": "Guardar", "common.open": "Abrir", "common.back": "Volver",
    "app.tagline": "Un sistema operativo organizado y agradable", "app.portal": "Portal del cliente", "app.signOut": "Salir",
    "login.heading": "Sistema de gestión de lavandería", "login.signinTitle": "Ingresa tus credenciales", "login.signupTitle": "Crear cuenta", "login.forgotTitle": "Recuperar contraseña", "login.email": "Correo", "login.password": "Contraseña", "login.fullName": "Nombre completo", "login.signIn": "Entrar", "login.signUp": "Crear cuenta", "login.sendLink": "Enviar enlace", "login.forgotPassword": "¿Olvidaste tu contraseña?", "login.noAccount": "¿Sin cuenta? Regístrate", "login.backToSignin": "Volver a entrar", "login.firstAccountNote": "La primera cuenta será admin. Las demás requieren activación.", "login.backHome": "Inicio", "waiting.title": "Activación pendiente", "waiting.body": "Tu cuenta necesita un rol antes de acceder al sistema."
  },
  de: {
    "common.language": "Sprache", "common.loading": "Lädt", "common.save": "Speichern", "common.open": "Öffnen", "common.back": "Zurück",
    "app.tagline": "Ein organisiertes Betriebssystem für Wäschereien", "app.portal": "Kundenportal", "app.signOut": "Abmelden",
    "login.heading": "Wäscherei-Managementsystem", "login.signinTitle": "Mit Zugangsdaten fortfahren", "login.signupTitle": "Konto erstellen", "login.forgotTitle": "Passwort wiederherstellen", "login.email": "E-Mail", "login.password": "Passwort", "login.fullName": "Vollständiger Name", "login.signIn": "Anmelden", "login.signUp": "Konto erstellen", "login.sendLink": "Link senden", "login.forgotPassword": "Passwort vergessen?", "login.noAccount": "Kein Konto? Registrieren", "login.backToSignin": "Zur Anmeldung", "login.firstAccountNote": "Das erste Konto wird Admin. Weitere Konten müssen aktiviert werden.", "login.backHome": "Startseite", "waiting.title": "Aktivierung ausstehend", "waiting.body": "Ihr Konto benötigt eine Rolle, bevor Sie zugreifen können."
  },
  zh: {
    "common.language": "语言", "common.loading": "加载中", "common.save": "保存", "common.open": "打开", "common.back": "返回",
    "app.tagline": "清晰有序的洗衣运营系统", "app.portal": "客户门户", "app.signOut": "退出",
    "login.heading": "洗衣店管理系统", "login.signinTitle": "请输入账号继续", "login.signupTitle": "创建账户", "login.forgotTitle": "找回密码", "login.email": "邮箱", "login.password": "密码", "login.fullName": "姓名", "login.signIn": "登录", "login.signUp": "注册", "login.sendLink": "发送链接", "login.forgotPassword": "忘记密码？", "login.noAccount": "没有账户？注册", "login.backToSignin": "返回登录", "login.firstAccountNote": "第一个账户将成为管理员，其他账户需要激活。", "login.backHome": "首页", "waiting.title": "等待激活", "waiting.body": "您的账户需要分配角色后才能访问系统。"
  },
  ja: {
    "common.language": "言語", "common.loading": "読み込み中", "common.save": "保存", "common.open": "開く", "common.back": "戻る",
    "app.tagline": "整理されたランドリー運営システム", "app.portal": "顧客ポータル", "app.signOut": "ログアウト",
    "login.heading": "ランドリー管理システム", "login.signinTitle": "ログイン情報を入力してください", "login.signupTitle": "アカウント作成", "login.forgotTitle": "パスワード再設定", "login.email": "メール", "login.password": "パスワード", "login.fullName": "氏名", "login.signIn": "ログイン", "login.signUp": "作成", "login.sendLink": "リンク送信", "login.forgotPassword": "パスワードを忘れましたか？", "login.noAccount": "アカウントがありませんか？登録", "login.backToSignin": "ログインに戻る", "login.firstAccountNote": "最初のアカウントが管理者になります。他のアカウントは有効化が必要です。", "login.backHome": "ホーム", "waiting.title": "有効化待ち", "waiting.body": "システムにアクセスするには役割の割り当てが必要です。"
  },
  pt: {
    "common.language": "Idioma", "common.loading": "Carregando", "common.save": "Salvar", "common.open": "Abrir", "common.back": "Voltar",
    "app.tagline": "Um sistema operacional organizado para lavanderias", "app.portal": "Portal do cliente", "app.signOut": "Sair",
    "login.heading": "Sistema de gestão de lavanderia", "login.signinTitle": "Digite suas credenciais", "login.signupTitle": "Criar conta", "login.forgotTitle": "Recuperar senha", "login.email": "E-mail", "login.password": "Senha", "login.fullName": "Nome completo", "login.signIn": "Entrar", "login.signUp": "Criar conta", "login.sendLink": "Enviar link", "login.forgotPassword": "Esqueceu a senha?", "login.noAccount": "Sem conta? Cadastre-se", "login.backToSignin": "Voltar ao login", "login.firstAccountNote": "A primeira conta vira administradora. Outras contas precisam ser ativadas.", "login.backHome": "Início", "waiting.title": "Aguardando ativação", "waiting.body": "Sua conta precisa de uma função antes de acessar o sistema."
  },
};

const navArabic: Record<string, string> = {
  "navGroup.اللوحات": "Dashboards",
  "navGroup.الطلبات": "Orders",
  "navGroup.محطات العمل": "Work stations",
  "navGroup.الموظفون": "Staff",
  "navGroup.المالية والتشغيل": "Finance & operations",
  "navGroup.الإدارة": "Administration",
  "navGroup.إدارة المنصة": "Platform admin",
  "nav./daily-operations": "Daily operations",
  "nav./today": "Today center",
  "nav./dashboard": "Owner dashboard",
  "nav./ops": "Operations dashboard",
  "nav./cs": "Customer service",
  "nav./manager": "Manager dashboard",
  "nav./driver": "Driver dashboard",
  "nav./live-map": "Live map",
  "nav./reports": "Reports & intelligence",
  "nav./orders": "All orders",
  "nav./orders/new": "New order",
  "nav./stations/reception": "Reception",
  "nav./stations/cleaning": "Cleaning",
  "nav./stations/drying-assembly": "Drying & assembly",
  "nav./stations/ironing": "Ironing",
  "nav./stations/packing": "Packing",
  "nav./stations/qc": "Quality QC",
  "nav./stations/delivery": "Couriers",
  "nav./staff/users": "Users",
  "nav./staff": "Staff",
  "nav./staff/schedule": "Work schedule",
  "nav./staff/leaves": "Leaves & holidays",
  "nav./staff/requests": "Requests & advances",
  "nav./staff/salaries": "Daily salaries",
  "nav./staff/ironing-payroll": "Ironing payroll",
  "nav./finance": "Finance",
  "nav./accounting": "Accounting & cash",
  "nav./ledger": "Ledger & statements",
  "nav./system-health": "System health",
  "nav./receivables": "Receivables",
  "nav./cash-closing": "Cash closing",
  "nav./budgets": "Budgets",
  "nav./inventory": "Inventory & equipment",
  "nav./billing": "Platform subscription",
  "nav./customers": "Customers",
  "nav./crm": "CRM & loyalty",
  "nav./services": "Services catalog",
  "nav./branches": "Branches",
  "nav./settings": "Settings",
  "nav./help": "Help center",
  "nav./admin/tenants": "Tenants",
  "nav./admin/users": "All users",
  "nav./admin/platform-fees": "Platform fees",
  "nav./admin/billing": "SaaS invoices",
  "role.super_admin": "Platform admin",
  "role.owner": "Owner",
  "role.cs_manager": "Customer service",
  "role.ops_manager": "Operations",
  "role.employee": "Employee",
  "role.customer": "Customer",
  "role.courier": "Courier",
};

for (const lang of ["fr", "it", "es", "de", "zh", "ja", "pt"] as LanguageCode[]) {
  dict[lang] = { ...dict[lang], ...navArabic };
}
dict.en = { ...dict.en, ...navArabic };

const STORAGE_KEY = "mjrh.language";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: "rtl" | "ltr";
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): LanguageCode {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (saved && SUPPORTED_LANGUAGES.some((x) => x.code === saved)) return saved;
  const browser = navigator.language.slice(0, 2).toLowerCase() as LanguageCode;
  return SUPPORTED_LANGUAGES.some((x) => x.code === browser) ? browser : "ar";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => detectLanguage());
  const meta = SUPPORTED_LANGUAGES.find((x) => x.code === language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = meta.dir;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, language);
  }, [language, meta.dir]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    dir: meta.dir,
    t: (key, fallback) => dict[language]?.[key] ?? dict.en?.[key] ?? fallback ?? key,
  }), [language, meta.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
