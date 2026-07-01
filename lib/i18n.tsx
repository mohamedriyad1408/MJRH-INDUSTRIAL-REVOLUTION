import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { internalTranslations } from "./i18n-internal";
import { publicLanguagePacks } from "./i18n-public-packs";

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
    "home.tagline": "منظومة تشغيل المشاريع — Industrial Revolution",
    "home.staffLogin": "دخول الموظفين",
    "home.badge": "منصة MJRH لتشغيل المشاريع",
    "home.heroTitle": "نظام واحد.. يشغّل أكثر من مشروع",
    "home.heroText": "MJRH منظومة تشغيل SaaS تخدم عدة مشاريع مستقلة، كل مشروع له بياناته وحساباته وموظفوه الخاصون. اختر المشروع اللي محتاج تدخله من القائمة، أو تعرّف أكتر على النظام.",
    "home.learnMore": "تعرّف على النظام",
    "home.projectsTitle": "المشاريع النشطة",
    "home.projectsText": "اختر مشروعك للدخول على بوابة العملاء أو الموظفين",
    "home.loadError": "تعذر تحميل قائمة المشاريع حاليًا.",
    "home.noProjects": "لا توجد مشاريع نشطة حاليًا.",
    "home.wantProject": "عندك مشروع وعايز تشغله بنظام MJRH؟",
    "home.wantProjectSub": "تواصل معنا لبدء تجربة مباشرة",
    "home.requestDemo": "اطلب تجربة",
    "biz.laundry": "مغسلة", "biz.retail": "تجاري", "biz.manufacturing": "صناعي", "biz.services": "خدمات", "biz.generic": "عام",
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
    "home.tagline": "Multi-project operating system — Industrial Revolution",
    "home.staffLogin": "Staff login",
    "home.badge": "MJRH platform for running projects",
    "home.heroTitle": "One system.. running multiple projects",
    "home.heroText": "MJRH is a SaaS operating system serving several independent projects, each with its own data, accounts and staff. Choose the project you need, or learn more about the system.",
    "home.learnMore": "Learn about the system",
    "home.projectsTitle": "Active projects",
    "home.projectsText": "Choose your project to enter the customer or staff portal",
    "home.loadError": "Could not load the project list right now.",
    "home.noProjects": "No active projects yet.",
    "home.wantProject": "Have a project you want to run on MJRH?",
    "home.wantProjectSub": "Contact us to start a live trial",
    "home.requestDemo": "Request a demo",
    "biz.laundry": "Laundry", "biz.retail": "Retail", "biz.manufacturing": "Manufacturing", "biz.services": "Services", "biz.generic": "General",
  },
  fr: {
    "common.language": "Langue", "common.loading": "Chargement", "common.save": "Enregistrer", "common.open": "Ouvrir", "common.back": "Retour",
    "app.tagline": "Un système d’exploitation clair et agréable", "app.portal": "Portail client", "app.signOut": "Déconnexion",
    "login.heading": "Système de gestion de blanchisserie", "login.signinTitle": "Connectez-vous pour continuer", "login.signupTitle": "Créer un compte", "login.forgotTitle": "Récupérer le mot de passe", "login.email": "E-mail", "login.password": "Mot de passe", "login.fullName": "Nom complet", "login.signIn": "Connexion", "login.signUp": "Créer", "login.sendLink": "Envoyer le lien", "login.forgotPassword": "Mot de passe oublié ?", "login.noAccount": "Pas de compte ? Inscrivez-vous", "login.backToSignin": "Retour à la connexion", "login.firstAccountNote": "Le premier compte devient administrateur. Les autres comptes doivent être activés.", "login.backHome": "Accueil", "waiting.title": "Activation en attente", "waiting.body": "Votre compte doit recevoir un rôle avant l’accès au système.",
    "home.tagline": "Système d’exploitation multi-projets — Industrial Revolution", "home.staffLogin": "Connexion personnel", "home.badge": "Plateforme MJRH pour gérer des projets", "home.heroTitle": "Un seul système.. pour plusieurs projets", "home.heroText": "MJRH est un système d’exploitation SaaS au service de plusieurs projets indépendants, chacun avec ses propres données, comptes et personnel. Choisissez votre projet ou découvrez le système.", "home.learnMore": "Découvrir le système", "home.projectsTitle": "Projets actifs", "home.projectsText": "Choisissez votre projet pour accéder au portail client ou personnel", "home.loadError": "Impossible de charger la liste des projets pour le moment.", "home.noProjects": "Aucun projet actif pour le moment.", "home.wantProject": "Vous avez un projet à lancer avec MJRH ?", "home.wantProjectSub": "Contactez-nous pour démarrer un essai en direct", "home.requestDemo": "Demander une démo", "biz.laundry": "Blanchisserie", "biz.retail": "Commerce", "biz.manufacturing": "Industrie", "biz.services": "Services", "biz.generic": "Général"
  },
  it: {
    "common.language": "Lingua", "common.loading": "Caricamento", "common.save": "Salva", "common.open": "Apri", "common.back": "Indietro",
    "app.tagline": "Un sistema operativo organizzato e piacevole", "app.portal": "Portale cliente", "app.signOut": "Esci",
    "login.heading": "Sistema di gestione lavanderia", "login.signinTitle": "Inserisci le credenziali", "login.signupTitle": "Crea un account", "login.forgotTitle": "Recupera password", "login.email": "Email", "login.password": "Password", "login.fullName": "Nome completo", "login.signIn": "Accedi", "login.signUp": "Crea account", "login.sendLink": "Invia link", "login.forgotPassword": "Password dimenticata?", "login.noAccount": "Non hai un account? Registrati", "login.backToSignin": "Torna al login", "login.firstAccountNote": "Il primo account diventa amministratore. Gli altri devono essere attivati.", "login.backHome": "Home", "waiting.title": "In attesa di attivazione", "waiting.body": "Serve un ruolo assegnato prima di accedere al sistema.",
    "home.tagline": "Sistema operativo multi-progetto — Industrial Revolution", "home.staffLogin": "Accesso staff", "home.badge": "Piattaforma MJRH per gestire progetti", "home.heroTitle": "Un solo sistema.. per più progetti", "home.heroText": "MJRH è un sistema operativo SaaS che serve più progetti indipendenti, ognuno con i propri dati, conti e personale. Scegli il tuo progetto o scopri di più sul sistema.", "home.learnMore": "Scopri il sistema", "home.projectsTitle": "Progetti attivi", "home.projectsText": "Scegli il tuo progetto per accedere al portale cliente o staff", "home.loadError": "Impossibile caricare l’elenco dei progetti al momento.", "home.noProjects": "Nessun progetto attivo al momento.", "home.wantProject": "Hai un progetto da avviare con MJRH?", "home.wantProjectSub": "Contattaci per iniziare una prova dal vivo", "home.requestDemo": "Richiedi una demo", "biz.laundry": "Lavanderia", "biz.retail": "Commercio", "biz.manufacturing": "Industria", "biz.services": "Servizi", "biz.generic": "Generale"
  },
  es: {
    "common.language": "Idioma", "common.loading": "Cargando", "common.save": "Guardar", "common.open": "Abrir", "common.back": "Volver",
    "app.tagline": "Un sistema operativo organizado y agradable", "app.portal": "Portal del cliente", "app.signOut": "Salir",
    "login.heading": "Sistema de gestión de lavandería", "login.signinTitle": "Ingresa tus credenciales", "login.signupTitle": "Crear cuenta", "login.forgotTitle": "Recuperar contraseña", "login.email": "Correo", "login.password": "Contraseña", "login.fullName": "Nombre completo", "login.signIn": "Entrar", "login.signUp": "Crear cuenta", "login.sendLink": "Enviar enlace", "login.forgotPassword": "¿Olvidaste tu contraseña?", "login.noAccount": "¿Sin cuenta? Regístrate", "login.backToSignin": "Volver a entrar", "login.firstAccountNote": "La primera cuenta será admin. Las demás requieren activación.", "login.backHome": "Inicio", "waiting.title": "Activación pendiente", "waiting.body": "Tu cuenta necesita un rol antes de acceder al sistema.",
    "home.tagline": "Sistema operativo multiproyecto — Industrial Revolution", "home.staffLogin": "Acceso del personal", "home.badge": "Plataforma MJRH para operar proyectos", "home.heroTitle": "Un solo sistema.. para varios proyectos", "home.heroText": "MJRH es un sistema operativo SaaS que da servicio a varios proyectos independientes, cada uno con sus propios datos, cuentas y personal. Elige tu proyecto o conoce más sobre el sistema.", "home.learnMore": "Conocer el sistema", "home.projectsTitle": "Proyectos activos", "home.projectsText": "Elige tu proyecto para entrar al portal de clientes o del personal", "home.loadError": "No se pudo cargar la lista de proyectos por ahora.", "home.noProjects": "No hay proyectos activos por ahora.", "home.wantProject": "¿Tienes un proyecto que quieras operar con MJRH?", "home.wantProjectSub": "Contáctanos para iniciar una prueba en vivo", "home.requestDemo": "Solicitar demo", "biz.laundry": "Lavandería", "biz.retail": "Comercio", "biz.manufacturing": "Manufactura", "biz.services": "Servicios", "biz.generic": "General"
  },
  de: {
    "common.language": "Sprache", "common.loading": "Lädt", "common.save": "Speichern", "common.open": "Öffnen", "common.back": "Zurück",
    "app.tagline": "Ein organisiertes Betriebssystem für Wäschereien", "app.portal": "Kundenportal", "app.signOut": "Abmelden",
    "login.heading": "Wäscherei-Managementsystem", "login.signinTitle": "Mit Zugangsdaten fortfahren", "login.signupTitle": "Konto erstellen", "login.forgotTitle": "Passwort wiederherstellen", "login.email": "E-Mail", "login.password": "Passwort", "login.fullName": "Vollständiger Name", "login.signIn": "Anmelden", "login.signUp": "Konto erstellen", "login.sendLink": "Link senden", "login.forgotPassword": "Passwort vergessen?", "login.noAccount": "Kein Konto? Registrieren", "login.backToSignin": "Zur Anmeldung", "login.firstAccountNote": "Das erste Konto wird Admin. Weitere Konten müssen aktiviert werden.", "login.backHome": "Startseite", "waiting.title": "Aktivierung ausstehend", "waiting.body": "Ihr Konto benötigt eine Rolle, bevor Sie zugreifen können.",
    "home.tagline": "Multi-Projekt-Betriebssystem — Industrial Revolution", "home.staffLogin": "Mitarbeiter-Login", "home.badge": "MJRH-Plattform für den Betrieb von Projekten", "home.heroTitle": "Ein System.. für mehrere Projekte", "home.heroText": "MJRH ist ein SaaS-Betriebssystem für mehrere unabhängige Projekte, jedes mit eigenen Daten, Konten und Mitarbeitern. Wählen Sie Ihr Projekt oder erfahren Sie mehr über das System.", "home.learnMore": "Mehr über das System erfahren", "home.projectsTitle": "Aktive Projekte", "home.projectsText": "Wählen Sie Ihr Projekt für das Kunden- oder Mitarbeiterportal", "home.loadError": "Die Projektliste konnte derzeit nicht geladen werden.", "home.noProjects": "Derzeit keine aktiven Projekte.", "home.wantProject": "Haben Sie ein Projekt, das Sie mit MJRH betreiben möchten?", "home.wantProjectSub": "Kontaktieren Sie uns für eine Live-Demo", "home.requestDemo": "Demo anfordern", "biz.laundry": "Wäscherei", "biz.retail": "Einzelhandel", "biz.manufacturing": "Fertigung", "biz.services": "Dienstleistungen", "biz.generic": "Allgemein"
  },
  zh: {
    "common.language": "语言", "common.loading": "加载中", "common.save": "保存", "common.open": "打开", "common.back": "返回",
    "app.tagline": "清晰有序的洗衣运营系统", "app.portal": "客户门户", "app.signOut": "退出",
    "login.heading": "洗衣店管理系统", "login.signinTitle": "请输入账号继续", "login.signupTitle": "创建账户", "login.forgotTitle": "找回密码", "login.email": "邮箱", "login.password": "密码", "login.fullName": "姓名", "login.signIn": "登录", "login.signUp": "注册", "login.sendLink": "发送链接", "login.forgotPassword": "忘记密码？", "login.noAccount": "没有账户？注册", "login.backToSignin": "返回登录", "login.firstAccountNote": "第一个账户将成为管理员，其他账户需要激活。", "login.backHome": "首页", "waiting.title": "等待激活", "waiting.body": "您的账户需要分配角色后才能访问系统。",
    "home.tagline": "多项目运营系统 — Industrial Revolution", "home.staffLogin": "员工登录", "home.badge": "MJRH 多项目运营平台", "home.heroTitle": "一个系统.. 运营多个项目", "home.heroText": "MJRH 是一个服务于多个独立项目的 SaaS 运营系统，每个项目都有自己的数据、账户和员工。选择您需要的项目，或了解更多关于系统的信息。", "home.learnMore": "了解系统", "home.projectsTitle": "活跃项目", "home.projectsText": "选择您的项目以进入客户或员工门户", "home.loadError": "暂时无法加载项目列表。", "home.noProjects": "目前没有活跃项目。", "home.wantProject": "有项目想用 MJRH 运营吗？", "home.wantProjectSub": "联系我们开始现场试用", "home.requestDemo": "申请演示", "biz.laundry": "洗衣店", "biz.retail": "零售", "biz.manufacturing": "制造业", "biz.services": "服务", "biz.generic": "通用"
  },
  ja: {
    "common.language": "言語", "common.loading": "読み込み中", "common.save": "保存", "common.open": "開く", "common.back": "戻る",
    "app.tagline": "整理されたランドリー運営システム", "app.portal": "顧客ポータル", "app.signOut": "ログアウト",
    "login.heading": "ランドリー管理システム", "login.signinTitle": "ログイン情報を入力してください", "login.signupTitle": "アカウント作成", "login.forgotTitle": "パスワード再設定", "login.email": "メール", "login.password": "パスワード", "login.fullName": "氏名", "login.signIn": "ログイン", "login.signUp": "作成", "login.sendLink": "リンク送信", "login.forgotPassword": "パスワードを忘れましたか？", "login.noAccount": "アカウントがありませんか？登録", "login.backToSignin": "ログインに戻る", "login.firstAccountNote": "最初のアカウントが管理者になります。他のアカウントは有効化が必要です。", "login.backHome": "ホーム", "waiting.title": "有効化待ち", "waiting.body": "システムにアクセスするには役割の割り当てが必要です。",
    "home.tagline": "マルチプロジェクト運営システム — Industrial Revolution", "home.staffLogin": "スタッフログイン", "home.badge": "プロジェクト運営のための MJRH プラットフォーム", "home.heroTitle": "1つのシステムで.. 複数のプロジェクトを運営", "home.heroText": "MJRH は複数の独立したプロジェクトにサービスを提供する SaaS 運営システムで、それぞれが独自のデータ、アカウント、スタッフを持っています。必要なプロジェクトを選択するか、システムについて詳しく知ってください。", "home.learnMore": "システムについて詳しく知る", "home.projectsTitle": "アクティブなプロジェクト", "home.projectsText": "顧客またはスタッフポータルにアクセスするプロジェクトを選択してください", "home.loadError": "現在プロジェクトリストを読み込めません。", "home.noProjects": "現在アクティブなプロジェクトはありません。", "home.wantProject": "MJRH で運営したいプロジェクトがありますか？", "home.wantProjectSub": "ライブトライアルを開始するにはお問い合わせください", "home.requestDemo": "デモを申請", "biz.laundry": "ランドリー", "biz.retail": "小売", "biz.manufacturing": "製造業", "biz.services": "サービス", "biz.generic": "一般"
  },
  pt: {
    "common.language": "Idioma", "common.loading": "Carregando", "common.save": "Salvar", "common.open": "Abrir", "common.back": "Voltar",
    "app.tagline": "Um sistema operacional organizado para lavanderias", "app.portal": "Portal do cliente", "app.signOut": "Sair",
    "login.heading": "Sistema de gestão de lavanderia", "login.signinTitle": "Digite suas credenciais", "login.signupTitle": "Criar conta", "login.forgotTitle": "Recuperar senha", "login.email": "E-mail", "login.password": "Senha", "login.fullName": "Nome completo", "login.signIn": "Entrar", "login.signUp": "Criar conta", "login.sendLink": "Enviar link", "login.forgotPassword": "Esqueceu a senha?", "login.noAccount": "Sem conta? Cadastre-se", "login.backToSignin": "Voltar ao login", "login.firstAccountNote": "A primeira conta vira administradora. Outras contas precisam ser ativadas.", "login.backHome": "Início", "waiting.title": "Aguardando ativação", "waiting.body": "Sua conta precisa de uma função antes de acessar o sistema.",
    "home.tagline": "Sistema operacional multi-projetos — Industrial Revolution", "home.staffLogin": "Login da equipe", "home.badge": "Plataforma MJRH para operar projetos", "home.heroTitle": "Um sistema.. para vários projetos", "home.heroText": "MJRH é um sistema operacional SaaS que atende vários projetos independentes, cada um com seus próprios dados, contas e equipe. Escolha o projeto desejado ou conheça mais sobre o sistema.", "home.learnMore": "Conhecer o sistema", "home.projectsTitle": "Projetos ativos", "home.projectsText": "Escolha seu projeto para acessar o portal do cliente ou da equipe", "home.loadError": "Não foi possível carregar a lista de projetos agora.", "home.noProjects": "Nenhum projeto ativo no momento.", "home.wantProject": "Tem um projeto que deseja operar com o MJRH?", "home.wantProjectSub": "Fale conosco para iniciar um teste ao vivo", "home.requestDemo": "Solicitar demonstração", "biz.laundry": "Lavanderia", "biz.retail": "Varejo", "biz.manufacturing": "Manufatura", "biz.services": "Serviços", "biz.generic": "Geral"
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



const publicTranslations: Record<LanguageCode, Record<string, string>> = {
  ar: {
    "landing.metaTitle": "MJRH — نظام تشغيل المغاسل",
    "landing.badge": "SaaS لإدارة وتشغيل المغاسل",
    "landing.heroTitle": "نظام واحد يشغّل المغسلة من أول قطعة لحد آخر جنيه.",
    "landing.heroText": "MJRH ليس برنامج طلبات فقط؛ هو منظومة تشغيل تشمل الطلبات، المحطات، المناديب، بوابة العميل، الخزن، القيود، التقارير، والتنبيهات الذكية.",
    "landing.ctaDemo": "احجز تجربة مباشرة",
    "landing.ctaPortal": "جرّب بوابة العميل",
    "landing.step1": "أنشئ مغسلة", "landing.step2": "أضف موظفين وفروع", "landing.step3": "سجل طلب", "landing.step4": "شغّل المحطات", "landing.step5": "حصّل ووصّل", "landing.step6": "أقفل الخزنة وشاهد التقارير",
    "landing.readiness": "جاهزية العمل الآن", "landing.readinessText": "فحص APDO، الماليات، المحطات، المناديب، وواتساب.",
    "landing.toolsTitle": "كل أدوات التشغيل في مكان واحد", "landing.toolsText": "مصمم حول سير عمل المغسلة الحقيقي وليس مجرد CRUD.",
    "landing.f1Title": "رحلة طلب كاملة", "landing.f1Text": "من الاستقبال حتى التسليم مع كل حدث ظاهر في رحلة الطلب.",
    "landing.f2Title": "محطات تشغيل حقيقية", "landing.f2Text": "استقبال، غسيل، تجفيف وتجميع، كي، تغليف، QC، مناديب.",
    "landing.f3Title": "توزيع كي حسب الحضور", "landing.f3Text": "التوزيع يتم على فنيي الكي الحاضرين فقط وبحساب يومية واضح.",
    "landing.f4Title": "خريطة ومناديب", "landing.f4Text": "استلام وتوصيل ومواقع وخط سير وسبب واضح لو التوزيع لم يتم.",
    "landing.f5Title": "محاسبة وخزن", "landing.f5Text": "حركات خزنة وقيود تلقائية ومصروفات ورواتب وإقفال يومي.",
    "landing.f6Title": "بوابة عميل", "landing.f6Text": "طلب من البيت، تتبع الطلب، رفع إثبات دفع InstaPay.",
    "landing.f7Title": "APDO وفحص نظام", "landing.f7Text": "كل عملية تجاوب: مين عمل؟ إيه البيانات؟ إيه الناتج؟ وهل لها قيد/خزنة/إشعار؟",
    "landing.f8Title": "جاهز للمغاسل الجديدة", "landing.f8Text": "أي مغسلة جديدة تحصل تلقائيًا على الفروع، الخزن، الحسابات، الكتالوج والميزات.",
    "landing.login": "دخول النظام", "landing.requestDemo": "طلب تجربة", "landing.customerPortal": "بوابة العميل", "landing.cash": "خزن", "landing.cashText": "إقفال يومي", "landing.reports": "تقارير", "landing.reportsText": "تشغيل ومالية", "landing.apdo": "APDO", "landing.apdoText": "رقابة كاملة",
    "landing.planPilot": "تجربة", "landing.planGrowth": "اشتراك شهري", "landing.planEnterprise": "اتفاق خاص", "landing.popular": "الأكثر طلبًا",
    "legal.privacyTitle": "سياسة الخصوصية", "legal.termsTitle": "الشروط والأحكام", "legal.back": "العودة",
    "privacy.p1": "يجمع MJRH البيانات اللازمة لتشغيل المغسلة مثل بيانات العملاء والطلبات والموظفين والمدفوعات والتقارير.",
    "privacy.p2": "لا يتم بيع بيانات العملاء. تستخدم البيانات فقط لتقديم الخدمة، التتبع، التقارير، الدعم، وتحسين التشغيل.",
    "privacy.p3": "يجب على صاحب المغسلة حماية حساباته وكلمات المرور، وتحديد صلاحيات الموظفين حسب دورهم.",
    "privacy.p4": "رسائل WhatsApp في الوضع الحالي تفتح تطبيق واتساب برسالة جاهزة ويرسلها الموظف يدويًا.",
    "privacy.p5": "لأي طلب حذف أو تصحيح بيانات، تواصل مع إدارة المغسلة أو مسؤول النظام.",
    "terms.p1": "MJRH نظام لإدارة وتشغيل المغاسل، ويعتمد على إدخال صحيح للبيانات من صاحب المغسلة والموظفين.",
    "terms.p2": "المخرجات المالية والتقارير تعتمد على صحة العمليات المسجلة مثل التحصيلات، المصروفات، إقفال الخزن، والمرتجعات.",
    "terms.p3": "يجب مراجعة الإعدادات والضرائب والأسعار قبل التشغيل التجاري.",
    "terms.p4": "النظام يوفر أدوات متابعة وإصلاح، لكن الإدارة مسؤولة عن القرارات التشغيلية والمالية النهائية.",
    "terms.p5": "أي تكامل خارجي مثل WhatsApp Business API أو الطباعة الصامتة يحتاج إعدادًا منفصلًا.",
    "track.title": "متابعة طلبك", "track.subtitle": "Dry Tech — نظام إدارة المغاسل", "track.notFound": "الطلب غير موجود", "track.checkLink": "تأكد من رابط المتابعة", "track.orderNumber": "رقم الطلب", "track.total": "الإجمالي", "track.items": "بنود الطلب", "track.payment": "الدفع", "track.paid": "تم تسجيل الدفع", "track.invoiceReady": "الفاتورة جاهزة للدفع", "track.invoiceReview": "الفاتورة قيد المراجعة النهائية", "track.overpayment": "تم تسجيل زيادة", "track.promised": "الموعد المتوقع للتسليم", "track.cancelled": "تم إلغاء الطلب",
    "track.step.pickup_waiting": "في انتظار المندوب", "track.step.pickup_assigned": "المندوب في الطريق", "track.step.received": "دخل الاستقبال", "track.step.cleaning": "تنظيف", "track.step.ironing": "كي", "track.step.packing": "تغليف", "track.step.ready": "جاهز للتسليم", "track.step.out_for_delivery": "خرج للتسليم", "track.step.delivered": "تم التسليم",
    "track.hint.pending": "طلبك اتسجل، وفي انتظار تعيين مندوب للاستلام من عنوانك.", "track.hint.assigned": "تم تعيين مندوب، وهو في طريقه لاستلام الطلب.", "track.hint.converted": "تم استلام الطلب من المندوب ودخل الاستقبال.", "track.hint.processing": "طلبك داخل التشغيل الآن. سيتم اعتماد الفاتورة بعد المراجعة النهائية.", "track.hint.ready": "طلبك جاهز للتسليم. تابع الدفع أو انتظر المندوب.", "track.hint.delivery": "طلبك خرج للتسليم مع المندوب.", "track.hint.delivered": "تم تسليم طلبك. شكرًا لثقتك بنا.",
    "customer.title": "بوابة العميل", "customer.tagline": "اطلب من بيتك وتابع طلبك", "customer.phoneLabel": "رقم هاتفك المسجل", "customer.login": "دخول", "customer.logout": "خروج", "customer.welcome": "أهلاً", "customer.myOrders": "طلباتي", "customer.newOrder": "طلب جديد", "customer.noOrders": "لا توجد طلبات بعد", "customer.previousOrders": "الطلبات السابقة", "customer.choosePieces": "اختار القطع", "customer.choosePiecesHelp": "اضغط + لإضافة قطعة، ثم صورها من الكاميرا بجانبها.", "customer.notes": "ملاحظات اختيارية", "customer.notesPlaceholder": "أي ملاحظات على الطلب...", "customer.expectedTotal": "الإجمالي المتوقع", "customer.sendOrder": "إرسال الطلب", "customer.invoiceReviewed": "الفاتورة تمت مراجعتها", "customer.downloadInvoice": "تحميل الفاتورة", "customer.uploadProof": "رفع الإيصال", "customer.amountPaid": "المبلغ المدفوع", "customer.waitInvoice": "الفاتورة قيد المراجعة. الدفع يظهر بعد اعتماد الفاتورة.", "customer.deliveredNoInvoice": "تم تسليم الطلب. لو احتجت نسخة فاتورة تواصل مع المغسلة.", "customer.addImage": "تم إضافة صورة", "customer.imageSaved": "تم حفظ صورة القطعة", "customer.orderSent": "تم إرسال طلبك",
  },
  en: {
    "landing.metaTitle": "MJRH — Laundry Operating System", "landing.badge": "SaaS for laundry operations", "landing.heroTitle": "One system to run the laundry from the first garment to the last pound.", "landing.heroText": "MJRH is not just an order app. It is an operating system for orders, stations, couriers, customer portal, cash, accounting, reports and smart alerts.", "landing.ctaDemo": "Book a live demo", "landing.ctaPortal": "Try customer portal", "landing.step1": "Create laundry", "landing.step2": "Add staff & branches", "landing.step3": "Register order", "landing.step4": "Run stations", "landing.step5": "Collect & deliver", "landing.step6": "Close cash and view reports", "landing.readiness": "Work readiness now", "landing.readinessText": "APDO, finance, stations, couriers and WhatsApp checks.", "landing.toolsTitle": "All operating tools in one place", "landing.toolsText": "Designed around real laundry workflows, not just CRUD.", "landing.login": "System login", "landing.requestDemo": "Request demo", "landing.customerPortal": "Customer portal", "landing.cash": "Cash", "landing.cashText": "Daily closing", "landing.reports": "Reports", "landing.reportsText": "Ops & finance", "landing.apdo": "APDO", "landing.apdoText": "Full control", "landing.f1Title":"Complete order journey", "landing.f1Text":"Every event from reception to delivery is visible.", "landing.f2Title":"Real work stations", "landing.f2Text":"Reception, cleaning, assembly, ironing, packing, QC and couriers.", "landing.f3Title":"Attendance-based ironing", "landing.f3Text":"Work is assigned only to present ironing technicians.", "landing.f4Title":"Map and couriers", "landing.f4Text":"Pickup, delivery, route planning and clear blockers.", "landing.f5Title":"Accounting and cash", "landing.f5Text":"Automatic cash movements, journals, expenses and payroll.", "landing.f6Title":"Customer portal", "landing.f6Text":"Order, track and upload InstaPay proof.", "landing.f7Title":"APDO and health", "landing.f7Text":"Every operation has actor, process, data and output.", "landing.f8Title":"New tenant ready", "landing.f8Text":"New laundries get branches, cash, accounts, catalog and features automatically.", "landing.planPilot":"Pilot", "landing.planGrowth":"Monthly plan", "landing.planEnterprise":"Custom deal", "landing.popular":"Popular",
    "legal.privacyTitle":"Privacy Policy", "legal.termsTitle":"Terms and Conditions", "legal.back":"Back", "privacy.p1":"MJRH collects data required to operate the laundry, including customers, orders, staff, payments and reports.", "privacy.p2":"Customer data is not sold. It is used to provide service, tracking, support and operational improvement.", "privacy.p3":"Laundry owners must protect accounts and assign roles carefully.", "privacy.p4":"WhatsApp messages currently open WhatsApp with a prepared message for manual sending.", "privacy.p5":"For deletion or correction requests, contact the laundry management.", "terms.p1":"MJRH is a laundry management and operations system that depends on accurate data entry.", "terms.p2":"Financial outputs depend on recorded payments, expenses, cash closing and returns.", "terms.p3":"Settings, taxes and prices must be reviewed before commercial operation.", "terms.p4":"The system provides monitoring and repair tools, but management remains responsible for decisions.", "terms.p5":"External integrations such as WhatsApp Business API or silent printing require separate setup.",
    "track.title":"Track your order", "track.subtitle":"Dry Tech — Laundry Management", "track.notFound":"Order not found", "track.checkLink":"Please check the tracking link", "track.orderNumber":"Order number", "track.total":"Total", "track.items":"Order items", "track.payment":"Payment", "track.paid":"Payment recorded", "track.invoiceReady":"Invoice ready for payment", "track.invoiceReview":"Invoice under final review", "track.overpayment":"Extra payment recorded", "track.promised":"Expected delivery", "track.cancelled":"Order cancelled", "track.step.pickup_waiting":"Waiting for courier", "track.step.pickup_assigned":"Courier on the way", "track.step.received":"Received", "track.step.cleaning":"Cleaning", "track.step.ironing":"Ironing", "track.step.packing":"Packing", "track.step.ready":"Ready", "track.step.out_for_delivery":"Out for delivery", "track.step.delivered":"Delivered", "track.hint.pending":"Your order was registered and is waiting for pickup assignment.", "track.hint.assigned":"A courier was assigned and is on the way.", "track.hint.converted":"The courier picked up your order and it entered reception.", "track.hint.processing":"Your order is being processed. The invoice will be confirmed after review.", "track.hint.ready":"Your order is ready. Please complete payment or wait for the courier.", "track.hint.delivery":"Your order is out for delivery.", "track.hint.delivered":"Your order has been delivered. Thank you.",
    "customer.title":"Customer Portal", "customer.tagline":"Order from home and track your order", "customer.phoneLabel":"Registered phone number", "customer.login":"Login", "customer.logout":"Logout", "customer.welcome":"Welcome", "customer.myOrders":"My orders", "customer.newOrder":"New order", "customer.noOrders":"No orders yet", "customer.previousOrders":"Previous orders", "customer.choosePieces":"Choose pieces", "customer.choosePiecesHelp":"Tap + to add a piece and attach a camera photo if needed.", "customer.notes":"Optional notes", "customer.notesPlaceholder":"Any notes about the order...", "customer.expectedTotal":"Estimated total", "customer.sendOrder":"Send order", "customer.invoiceReviewed":"Invoice reviewed", "customer.downloadInvoice":"Download invoice", "customer.uploadProof":"Upload proof", "customer.amountPaid":"Amount paid", "customer.waitInvoice":"Invoice is under review. Payment appears after invoice approval.", "customer.deliveredNoInvoice":"Order delivered. Contact the laundry if you need an invoice copy.", "customer.addImage":"Image added", "customer.imageSaved":"Piece image saved", "customer.orderSent":"Your order was sent"
  },
  fr: {}, it: {}, es: {}, de: {}, zh: {}, ja: {}, pt: {}
};

for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) Object.assign(dict[lang], publicTranslations[lang]);
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) Object.assign(dict[lang], publicLanguagePacks[lang] ?? {});
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) Object.assign(dict[lang], internalTranslations[lang]);

export function translateForLanguage(language: LanguageCode, key: string, fallback?: string) {
  const local = dict[language]?.[key];
  if (local !== undefined) return local;
  if (language === "en") return dict.en?.[key] ?? fallback ?? key;
  if (language === "ar") return fallback ?? dict.ar?.[key] ?? dict.en?.[key] ?? key;
  // For other languages (fr, it, es, de, zh, ja, pt):
  // We prioritize English as fallback, then Arabic, then standard key
  return dict.en?.[key] ?? dict.ar?.[key] ?? fallback ?? key;
}

export function interpolate(template: string, values: Record<string, string | number | null | undefined> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

const STORAGE_KEY = "mjrh.language.v2";
const LEGACY_STORAGE_KEY = "mjrh.language";

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
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY) as LanguageCode | null;
  if (legacy === "ar") return "ar";
  return "ar";
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
    t: (key, fallback) => translateForLanguage(language, key, fallback),
  }), [language, meta.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
