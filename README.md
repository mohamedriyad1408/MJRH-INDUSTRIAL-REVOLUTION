# MJRH INDUSTRIAL REVOLUTION — منظومة تشغيل المشاريع التشغيلية

**آخر تحديث: 2026-07-11**
**النسخة: Platform v2.0 — Enterprise OS**

> منصة واحدة تشغّل أي مشروع تشغيلي — من أول عملية لحد إقفال الخزنة. من مغسلة صغيرة إلى فندق 7 نجوم، مستشفى، أو سلسلة مطاعم 50 فرع — نفس النواة، تخصيص لا نهائي.

---

## 1) الرؤية الجديدة — من مغسلة إلى Industrial Revolution

**قبل:** نظام إدارة مغاسل فقط (Dry Tech)
**الآن:** **Project Operations Platform** — نظام تشغيل SaaS يخدم عدة مشاريع مستقلة:

- 🧺 مغسلة ملابس
- 🧹 سجاد ومفروشات
- 🔧 ورشة تصليح
- 🚗 غسيل سيارات
- 🏠 تنظيف منازل ومكاتب
- 🍽️ مطعم توصيل
- 🏭 سلسلة مغاسل / مصانع / فنادق
- 📦 أي نشاط تشغيلي آخر

**الشعار الجديد:** `أوقف التسريب التشغيلي قبل أن يتحول لخسارة مالية.`
**EN Vision:** `Stop Operational Leakage Before It Becomes Financial Loss.`
> The Operational Intelligence Platform for Industrial, Commercial, Healthcare, and Service Organizations.

---

## 2) البنية الجديدة — Enterprise Core Scalable

### 2.1 الجداول الجديدة (2026-07)

#### **enterprises** — الشركات القابضة
```sql
id, name, slug UNIQUE, owner_user_id, industry_type CHECK (
  hospitality | healthcare | food_chain | retail_chain | laundry_chain | generic
), settings JSONB
```
- تسمح بهيكل: **Holding → Projects → Branches by Region**
- مثال: مجموعة فنادق تمتلك 20 مشروع فندقي، كل مشروع له 5 فروع

#### **tenants** — المشاريع (مغسلة سابقة)
اضافات جديدة:
- `enterprise_id` — ربط بالشركة القابضة
- `parent_tenant_id` — تسلسل هرمي للمشاريع
- `custom_config JSONB` — إعدادات مخصصة لكل مشروع

#### **branches** — نقاط التشغيل
اضافات:
- `branch_code` — كود فريد
- `region` — منطقة جغرافية
- `custom_config JSONB` — تخصيص لكل فرع

#### **orders** — العمليات
اضافات:
- `enterprise_id`
- `custom_fields JSONB` — حقول مخصصة (رقم غرفة، رقم ملف مريض، رقم طاولة...)

#### **custom_field_definitions** — تعريف الحقول المخصصة
```sql
tenant_id, entity_type (order/branch/customer), field_key, field_type, label, is_required
```

#### **workflow_stages** — مراحل تشغيل قابلة للتخصيص
- كان: reception, cleaning, ironing, packing, qc, delivery (ثابت)
- الآن: أي مشروع يعرّف مراحله بنفسه عبر `get_workflow_stages` RPC
- مثال مطعم: استلام طلب → مطبخ → تغليف → جاهز → توصيل
- مثال مستشفى: استقبال عينة → تحليل → مراجعة → تقرير

#### **workflow_templates** — قوالب جاهزة
- `category, price, downloads, preview_image_url, is_featured, created_by`
- 8 قوالب افتراضية مطابقة لـ BUSINESS_TYPES في signup
- **Marketplace عام** `/marketplace` — anon readable (RLS policy)
- **Marketplace tenant** `/$tenant/marketplace` — كل النشط
- **Marketplace admin** `/_admin/admin/templates` — الكل CRUD
- RPCs:
  - `export_workflow_template(UUID) RETURNS JSONB`
  - `import_workflow_template(UUID, JSONB) RETURNS INTEGER`
  - `apply_workflow_template`
- View: `marketplace_stats`

#### **service_categories** + **custom_fields**
- `id, tenant_id, name, slug, icon, color, sort_order, is_active`
- Backfill من الجدول القديم (كان id, tenant_id, name, display_order فقط)
- `category_id FK` في `service_items`

#### **custom_roles** — أدوار مخصصة
```sql
tenant_id, slug UNIQUE per tenant, name, permissions JSONB (9 keys), is_system
```
- 5 أدوار نظام افتراضية: owner, ops_manager, cs_manager, employee, courier
- UI في `/$tenant/settings/roles.tsx` matrix 9 permissions
- Seed تلقائي عند إنشاء tenant جديد

#### **operating_budgets** + **v_operating_budgets**
- `period_type CHECK monthly/weekly, period_label UNIQUE per tenant, expected_revenue, expected_expenses, expense_details JSONB`
- View `v_operating_budgets` بـ `security_invoker` يحسب:
  - `actual_revenue` من `orders total WHERE status=delivered`
  - `actual_expenses` من `expenses amount`
- كان يسبب خطأ `Could not find the table 'public.v_operating_budgets' in the schema cache` — تم إصلاحه

### 2.2 الـ Views & RPCs الجديدة
- `enterprise_branch_summary` — إيرادات كل الفروع مجمعة للمالك
- `create_enterprise_with_tenant()` — إنشاء شركة قابضة + مشروع في خطوة
- `list_active_tenants_public()` — للصفحة الرئيسية
- `self_service_create_tenant` — مع limit 3 tenants per user + currency + business_type

---

## 3) الـ Pivot الكامل — من مغسلة إلى منصة

### 3.1 ما تم حذفه / تنظيفه (85MB)
- `demo-video/*.mp4` 14.4MB
- `audio/*.mp3` 2.4MB (17 ملف)
- `uploads/*` 53MB (صور IMG _ JPG 4.6MB كل واحدة)
- `images/*` 1.2MB (real_* machines)
- `public/media/demo` 13MB
- duplicates `manifest-icon-512.png, workflow-256/512`
- **الآن `public/` 984KB فقط**

### 3.2 إزالة Demo Tab
- كان موجود في sidebar بلا فائدة لمشروع Dry Tech الحقيقي — تم حذفه

### 3.3 BUSINESS_TYPES الجديد (8 أنواع تطابق القوالب)
```ts
{ value: "laundry", label: "مغسلة ملابس", icon: "🧺" },
{ value: "carpet", label: "مغسلة سجاد ومفروشات", icon: "🧹" },
{ value: "repair", label: "ورشة تصليح", icon: "🔧" },
{ value: "carwash", label: "غسيل سيارات", icon: "🚗" },
{ value: "cleaning", label: "تنظيف منازل ومكاتب", icon: "🏠" },
{ value: "restaurant", label: "مطعم توصيل", icon: "🍽️" },
{ value: "laundry_chain", label: "سلسلة مغاسل", icon: "🏭" },
{ value: "other", label: "نشاط آخر", icon: "📦" },
```
- قديم كان فيه `Other` مكرر مرتين + عدم تطابق مع القوالب

### 3.4 Mapping Business Type → Template Slug
Migration `20260711000001`:
- carpet → carpet
- repair/tailoring/dry_cleaning/linen_service → repair
- carwash → carwash
- cleaning → cleaning
- restaurant → restaurant
- else → laundry

---

## 4) الواجهة الجديدة — Enterprise Clean (Stripe/Linear Style)

### 4.1 المشاكل القديمة التي تم إصلاحها
- **Sidebar/Notification/Tasks تفتح نصها برا الشمال:**
  السبب: `styles.css` كان فيه:
  ```css
  [role="dialog"], [role="alertdialog"], .radix-dialog-content { 
    transform: translate(-50%,-50%) !important; left:50% !important; 
  }
  ```
  ده كان بيجبر `Sheet` (sidebar uses Sheet side bottom) إنه يتوسط الشاشة. الحل: قصرناه على `.radix-dialog-content` فقط.
  + Popover كان `align="center"` مع `w-[calc(100vw-32px)]` بيطلع برا — بقى `align="end" side="bottom" avoidCollisions`
  + Tooltip `side="right"` ثابت — بقى RTL-aware `isRTL ? "left" : "right"`

- **Scrolling محتاج ماوس على scrollbar:**
  السبب: `body { overscroll-behavior-y: contain; }` + تجربة `h-screen overflow-hidden` عملت صفحة 22454px فاضية. الحل: رجعنا لـ `min-h-screen flex w-full` + `app-shell flex-1 flex-col min-w-0` + `overscroll-behavior-y: auto`

- **404 NOT_FOUND:**
  السبب: `vercel.json` rewrite فيه مسافة زيادة `"/((?!assets/|.*\\.[a-zA-Z0-9]+$).* )"` — صلحناها لـ `"/((?!assets/|.*\\.[a-zA-Z0-9]+$).*)"`

- **Logo مش شفاف:**
  الأصلي `1783626460376.png` 1408x768 RGB mode، corners RGBA(205,205,205,255) 0% transparent مع checkerboard مطبوع. اتعالج flood-fill من الحواف `diff<25 && max>180` → transparent، اتقص لـ 518x568 110KB 76% transparent.
  الجديد `logo-4-industrial-workflow.png` 560x572 RGBA فيه workflow hexagons (factory, truck, share, chart, check + MJRH + gear) شفاف أصلاً، اتنضف أكتر → `mjrh-logo.png` 248KB + `icon-512.png` 180KB + `icon-192.png` 36KB + `favicon.png` 2.3KB + `hero-workflow.png` 280KB
  + Animation: `@keyframes logo-float, logo-glow` class `logo-animated` 4s infinite

- **المنصة شكلها فرح:**
  تم تغييره لـ Stripe/Linear minimal — بدون زحمة، بدون Oracle mentions (grep Oracle → 0)، رقم تليفون مرة واحدة فقط تحت COPYRIGHTS مش 4 مرات.

### 4.2 التصميم الجديد
- Header sticky blur `bg-white/80 backdrop-blur-xl`
- Hero بـ vision مش Feature: `أوقف التسريب التشغيلي قبل أن يتحول لخسارة مالية.` بدل `نظام واحد يشغل كل فروعك`
- Badges: `منظومة تشغيل للمشاريع من 1 إلى 500 فرع` / `Built for any operational project...`
- Enterprise Core Card مع `Live` + 50+ فرع / Multi شركات / ∞ تخصيص
- Trusted Strip: فنادق 7 نجوم، مستشفيات، سلاسل مطاعم، مصانع
- Marketplace Preview في landing و home يوضح الفرق بين:
  - `/marketplace` (عام - مميز فقط - للزوار)
  - `/$tenant/marketplace` (كل النشط - للمالك)
  - `/_admin/admin/templates` (الكل - للسوبر أدمن)
  - `/signup` (أنواع أساسية فقط)
- Features: 6 كروت minimal (مراحل مخصصة، فريق وصلاحيات، خزنة ومحاسبة، متعدد الفروع، توزيع ذكي، مخزون وخدمات)
- Enterprise Section: Card أسود مع workflow image
- Footer: صورة واحدة، COPYRIGHTS، تليفون واحد `+20 113 080 4784`

### 4.3 App Sidebar الجديد
قديم: 10 مجموعات ألماني (Vorstand, Betriebsleitung, Vertrieb, Marketing, Kundenservice, Rechtsabteilung, Personalwesen, Finanzwesen) 288 سطر
جديد: 4 مجموعات عامة:
- الرئيسية
- التشغيل والمحطات
- العملاء والمبيعات
- المالية والإدارة
+ Admin 3 مجموعات
+ Dynamic stages injection عبر `supabase.rpc("get_workflow_stages")`

---

## 5) الترجمة — 9 لغات كاملة (Fix 2026-07-11)

### 5.1 المشكلة
**"بص لباقي الصفحة هتلاقيها بالعربي واحنا مختارين فرنساوي"**

السبب كان 3 مشاكل:
1. `landing.tsx` و `index.tsx` فيهم نصوص عربي hardcoded مش بتستخدم `t()`
2. `publicTranslations.ar` الـ badge كان ياباني `あらゆる運用プロジェクト...` (غلط)
3. `publicTranslations.fr/it/es/de/zh/ja/pt` كلها إنجليزي! فالفرنساوي كان بيرجع إنجليزي أو عربي fallback
4. `dict.zh/ja` كانوا `""` فاضيين → UI فاضي

### 5.2 الحل الكامل
**أعدت كتابة `lib/i18n.tsx` (364 → 1000+ سطر) + `lib/i18n-public-packs.ts`:**

- **40+ key جديد لكل الصفحات في 9 لغات:**
  `landing.navPlatform, navSolutions, navEnterprise, ctaStartNow, trustedHotelsShort, enterpriseCore, marketplaceTitle, featuresTitle, featureCustomStagesTitle...` + `home.badgeEnterprise, heroTitlePlatform, statsBranchLabel, trustedHotels, activeProjectsTitle...` + `marketplace.*`

- **ترجمة Vision لكل لغة:**
  - AR: `أوقف التسريب التشغيلي قبل أن يتحول لخسارة مالية.`
  - EN: `Stop Operational Leakage Before It Becomes Financial Loss.`
  - FR: `Stoppez les fuites opérationnelles avant qu'elles ne deviennent des pertes financières.`
  - IT: `Ferma le perdite operative prima che diventino perdite finanziarie.`
  - ES: `Detenga las fugas operativas antes de que se conviertan en pérdidas financieras.`
  - DE: `Stoppen Sie betriebliche Leckagen, bevor sie zu finanziellen Verlusten werden.`
  - ZH: `在运营泄漏变成财务损失之前阻止它。`
  - JA: `運用上のリークが財務的損失になる前に止めましょう。`
  - PT: `Pare o vazamento operacional antes que se torne perda financeira.`

- **إصلاح `translateForLanguage`:**
  ```ts
  if (local !== undefined && local !== "") return local; // كان بيرجع "" فاضي
  ```

- **إعادة كتابة `landing.tsx` و `index.tsx` و `marketplace.tsx` بالكامل:**
  مفيش حرف عربي hardcoded — كله `t("landing.xxx")` و `interpolate(t("home.activeProjectsCount"), {count})`

**النتيجة:** دلوقتي فرنساوي كله فرنساوي، إنجليزي كله إنجليزي، مفيش عربي يظهر إلا لما تختار عربي.

### 5.3 اللغات المدعومة
| كود | اسم أصلي | dir |
|-----|----------|-----|
| ar | العربية | rtl |
| en | English | ltr |
| fr | Français | ltr |
| it | Italiano | ltr |
| es | Español | ltr |
| de | Deutsch | ltr |
| zh | 中文 | ltr |
| ja | 日本語 | ltr |
| pt | Português | ltr |

---

## 6) الصفحات والـ Routing

### 6.1 الصفحات العامة
- `/` — Home Directory (قائمة المشاريع النشطة + marketplace preview + enterprise ready)
- `/landing` — Landing enterprise clean مع workflow image + marketplace preview + features + enterprise + CTA
- `/marketplace` — Public marketplace (anon readable, featured templates, category filter, preview stages, CTA to signup)
- `/signup` — إنشاء مشروع جديد (8 أنواع + عملة + owner info + slug auto + RPC self_service_create_tenant)
- `/login` — دخول + LanguageSwitcher + tenantSlug detection
- `/privacy`, `/terms`, `/track.$token`, `/customer-portal`, `/join.$slug`

### 6.2 صفحات Tenant
- `/$tenant/today`, `/dashboard`, `/ops`, `/cs`, `/manager`, `/driver`, `/live-map`, `/reports`, `/orders`, `/orders/new`, `/daily-operations`
- `/stations/reception`, `/cleaning`, `/drying-assembly`, `/ironing`, `/packing`, `/qc`, `/delivery`
- **`/$tenant/stations/$stage.tsx`** — NEW dynamic generic station page: يجيب `workflow_stages` عبر `get_workflow_stages` RPC + `service_units where current_stage=stage` + move to next stage via `stage_order`
- `/staff`, `/staff/users`, `/schedule`, `/leaves`, `/requests`, `/salaries`, `/ironing-payroll`
- `/finance`, `/accounting`, `/ledger`, `/system-health`, `/receivables`, `/cash-closing`, `/budgets`, `/inventory`, `/billing`, `/customers`, `/crm`, `/services`, `/branches`, `/settings`, `/help`
- `/$tenant/settings/workflow.tsx` — كان فيه `createFileRoute("/$tenant/settings/workflow" as any)` بيسبب `expected route id to be a string literal` — اتصلح + Regen `routeTree.gen.ts` + Export/Import workflow via RPCs
- `/$tenant/settings/roles.tsx` — Custom roles UI matrix 9 keys
- `/$tenant/marketplace.tsx` — Apply template via `apply_workflow_template`
- `/$tenant/branches/$id` — شاشة فرع منفصلة

### 6.3 صفحات Admin
- `/_admin/admin/tenants`, `/users`, `/platform-fees`, `/billing`, `/telemetry`, `/templates.tsx` (CRUD workflow_templates)

---

## 7) قاعدة البيانات — Migrations المهمة

- `20260709120000_platform_free_tier_features.sql`
  - كان فيه `CREATE INDEX CONCURRENTLY` (يفشل داخل transaction) + `ALTER PUBLICATION supabase_realtime ADD TABLE` غير idempotent — اتصلح لـ `CREATE INDEX IF NOT EXISTS` + `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_publication_tables...)`
  - currency column, self_service_create_tenant RPC مع tenant limit 3, table_row_counts view security_invoker

- `20260709130000_configurable_workflow_stages.sql`
  - RLS كان `USING (tenant_id = (SELECT current_setting('app.current_tenant',true)::uuid))` غلط → `public.can_access_tenant(tenant_id)`
  - tables: `workflow_stages`, `workflow_templates`, RPCs `apply_workflow_template`, `get_workflow_stages`, `ensure_default_workflow_for`

- `20260709140000_fix_seed_tenant_defaults_tenant_features.sql`
  - استرجاع `tenant_features` insertion اللي اتشال في override قبل كده
  - 10 features: accounting, apdo, cash_closing, customer_portal, customer_returns, driver_map, inventory, ironing_distribution, orders, payment_proofs

- `20260710120000_service_categories_and_custom_fields.sql`
  - الجدول القديم كان `id, tenant_id, name, display_order` بس — اتصلح `ALTER TABLE ADD COLUMN IF NOT EXISTS is_active, slug, icon, color, sort_order` + backfill slug

- `20260710150000_enterprise_core_scalable.sql`
  - enterprises, tenants.enterprise_id/parent_tenant_id/custom_config, branches.branch_code/region/custom_config, orders enterprise_id/custom_fields, custom_field_definitions, enterprise_branch_summary view, RPC create_enterprise_with_tenant

- `20260710200000_phase3_marketplace_custom_roles_export_import.sql`
  - custom_roles (tenant_id, slug UNIQUE, permissions JSONB, is_system) + 5 system roles seed + workflow_templates category/price/downloads/featured + RPCs export/import

- `20260710250000_template_marketplace_public.sql`
  - anon read policy لـ workflow_templates + view marketplace_stats

- `20260711000000_fix_budgets_view_missing.sql`
  - operating_budgets table + v_operating_budgets view مع actual_revenue من delivered orders و actual_expenses من expenses

- `20260711000001_fix_workflow_template_by_business_type.sql`
  - map business_type → template_slug + backfill stages

---

## 8) البنية التقنية

- **Frontend:** React 18 + Vite + TanStack Router (file-based routing + routeTree.gen.ts)
- **UI:** Tailwind + Radix UI + shadcn/ui (sidebar 745 lines, sheet, popover)
- **Backend:** Supabase Postgres + RLS + RPCs + Realtime (supabase_realtime publication)
- **Auth:** Supabase Auth + user_roles + tenant_features
- **i18n:** Custom context + 9 languages + 3 sources (dict + publicTranslations + publicLanguagePacks + internalTranslations 600KB) + interpolate
- **Logo:** `/mjrh-logo.png` 248KB RGBA + `logo-animated` float+glow animation
- **PWA:** `/icon-192.png` 36KB + `/icon-512.png` 180KB + `/favicon.png` 2.3KB + `/manifest.json`
- **Deploy:** Vercel (buildCommand `npm run build`, output `dist`, install `--legacy-peer-deps`, rewrite fix)
- **Repo:** `https://github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION`
- **Live:** `https://mjrh.vercel.app` / `https://mjrh-d93e9ydee-mjrh.vercel.app`
- **Supabase Project Ref:** `dngjfjrjddigqadlyain` URL `https://dngjfjrjddigqadlyain.supabase.co`

---

## 9) أوامر مهمة

### تثبيت وتشغيل
```bash
npm install --legacy-peer-deps
npm run dev
```

### Build & Typecheck & Tests
```bash
npm install --legacy-peer-deps
./node_modules/.bin/tsc -b --pretty false
npm run test:run
./node_modules/.bin/vite build
```

### Supabase
```bash
npx supabase link --project-ref dngjfjrjddigqadlyain
npx supabase db push --include-all
npx supabase functions deploy admin-actions --project-ref dngjfjrjddigqadlyain
npx supabase functions deploy ocr-payment-proof --project-ref dngjfjrjddigqadlyain
```

### CI Checks (اللي بيجري في GitHub Actions)
```bash
npm run typecheck
npm run test:run
npm run e2e:public
npm run e2e:i18n
npm run verify:new-tenant
npm run build
npm run bundle:check
npm run repo:guard
```

### Git
```bash
git remote add origin https://github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION.git 2>/dev/null || git remote set-url origin https://github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION.git
git config user.name 'MJRH'
git config user.email 'dev@mjrh.app'
git push origin main
```

---

## 10) CI / CD — Green Builds

### آخر CI Runs (يوليو 2026)
- #207 `29042407898` ✅ success بعد fix `seed_tenant_defaults`
- #213 `29089442672` ✅ success بعد e2e i18n fix
- #214 `29091666449` ✅ hero linguistic fix
- #215 `29093080876` ✅ enterprise core
- #219 `29100092096` ✅ Users import fix
- #220 `29105452599` ✅ clean enterprise redesign remove Oracle
- #221 `29110005535` ✅ industrial workflow logo + animation
- #222 `29111581785` ✅ all languages generic
- #223-226 marketplace public
- #227 budgets fix
- #231 `e2848334` ✅ vercel rewrite fix 404 → 200
- **#29150006248 ✅ fix(i18n) full translation coverage — no more Arabic when French selected** (الأخير 2026-07-11)

### Bundle
```
Some chunks are larger than 600 kB after minification — expected (i18n-internal 600KB)
Bundle budget passed
```

### Vercel
- `vercel.json` rewrite fixed: كان فيه مسافة زيادة تسبب 404
- الآن prod asset contains `أوقف التسريب` مش `منصة واحدة تشغّل`

---

## 11) بيانات تجريبية — Dry Tech مع 500 طلب

- Tenant: `dry-tech` id `c0ea27c7-138e-4d12-b732-6981bddb4c97`
- Branches: `a915071d-2365-44cc-bcf8-c6a024078639` main + `db0bbbec-c880-4865-9416-c32ebcd73e67` Banafsaj
- Customers: 8 ids
- Orders: 530 total (30 + 500 مولدة بتواريخ 2026-01-12 إلى 2026-07-10)، 239 delivered
- Sequence fix: `setval order_number_seq to MAX`
- Unit number cumulative fix لمنع duplicate label_code

---

## 12) الأمان والتوكنات

- تم استخدام PATs أثناء التطوير:
  - GitHub PAT `ghp_...` (يجب تدويره قبل التشغيل الرسمي)
  - Supabase PAT `sbp_...`
  - Vercel token `vcp_...` (كان forbidden لاحقاً)
- لا تضع التوكنات في README أو الكود
- `repo:guard` يفحص `docs/STAGING_SETUP.md: contains service role env assignment` — يفشل لو لقى service role في docs

---

## 13) نسبة الجاهزية — Enterprise

- **تشغيل فرع واحد:** 95%
- **تشغيل متعدد الفروع 50+:** 92%
- **Enterprise Core (شركة قابضة → مشاريع → فروع):** 88%
- **Marketplace Public + Tenant + Admin:** 90%
- **Custom Roles + Export/Import:** 90%
- **i18n 9 لغات (بعد fix 2026-07-11):** 98%
- **UI Clean Enterprise (Stripe/Linear):** 95%

**المنصة جاهزة لعرض مستثمر:** واجهة نظيفة حديثة متطورة، لوجو متحرك، ترجمة كاملة، marketplace واضح، enterprise badges (فنادق 7 نجوم، مستشفيات، سلاسل مطاعم 50 فرع).

---

## 14) خريطة الطريق — القادم

### Phase 4 (مقترح)
- [ ] Enterprise UI لـ `custom_field_definitions` و `enterprise_branch_summary`
- [ ] مقارنة فروع متقدمة برسوم بيانية
- [ ] ميزانيات منفصلة لكل فرع
- [ ] مخزون مستقل بالكامل لكل فرع مع تحويل بين الفروع
- [ ] Auto close للتنبيهات عندما تُحل المشكلة
- [ ] تصدير Excel/PDF لتقارير الفروع مجمعة
- [ ] تحسين سبب منع نقل الطلب داخل كل محطة ببيانات القطع المانعة
- [ ] صفحة "اعمل إيه الآن؟" للمالك حسب الفرع
- [ ] فلتر الفروع في `today`, `reports`, `accounting`, `cash-closing`, `live-map`
- [ ] ربط الخزنة الافتراضية للفرع (تحصيلات فرع → خزنة فرع)

### Phase 5 — AI & IoT
- Predictive maintenance للمعدات
- Smart scheduling للعمالة حسب عبء العمل
- OCR متقدم لصور القطع
- WhatsApp Business API بدل manual open

---

## 15) مبدأ APDO — كل عملية تجيب على 5 أسئلة

كل عملية في النظام يجب أن تجيب:

- **A**ctor: مين عمل؟
- **P**rocess: إيه البيانات؟
- **D**ata: إيه الناتج؟
- **O**utput: هل لها قيد/خزنة/إشعار؟

إذا لم تجب العملية على هذه الأسئلة، فهي غير مكتملة منطقيًا.

> + **Branch** — تمت في أي فرع؟
> + **Tenant / Enterprise** — تمت في أي مشروع/شركة؟

---

## 16) دليل لأي Chat جديد

1. اقرأ هذا README كاملًا + `docs/12_PROJECT_PLATFORM_PIVOT_PROPOSAL.md` + `docs/11_CONFIGURABLE_PLATFORM_PLAN.md`
2. شغّل:
   ```bash
   npm install --legacy-peer-deps
   ./node_modules/.bin/tsc -b --pretty false
   npm run test:run
   ./node_modules/.bin/vite build
   ```
3. راجع آخر migrations في `supabase/migrations/`
4. لا تضف Feature كزر فقط؛ اربطها منطقيًا بـ enterprise_id, tenant_id, branch_id, custom_fields, workflow_stages, cash_accounts, journals, reports, notifications
5. حافظ على: Multi-Currency, Signup flow, Realtime infra, Branch Filter, Thermal Print CSS, Documentation
6. **لا تستخدم Oracle في الواجهة** — Enterprise power بدون ذكر Oracle
7. **رقم التليفون مرة واحدة فقط** تحت COPYRIGHTS
8. **Logo شفاف + animation** `logo-animated`
9. **كل نص مرئي لازم `t()`** — ممنوع hardcoded عربي في أي صفحة عامة — ده سبب bug 2026-07-11

---

## 17) حقوق

```
© 2026 MJRH INDUSTRIAL REVOLUTION — BY MUHAMMAD RIYAD
Enterprise OS for Hotels, Hospitals, 50+ Chains
+20 113 080 4784
```

ليس مجرد نظام مغسلة — إنه **نظام تشغيل للمشاريع التشغيلية من 1 إلى 500 فرع**.

