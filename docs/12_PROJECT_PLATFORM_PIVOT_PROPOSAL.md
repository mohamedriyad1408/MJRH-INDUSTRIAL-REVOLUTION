# MJRH — خطة التحول من منصة مغاسل إلى منصة مشاريع
## Industrial Revolution Platform Pivot

**التاريخ:** 2026-07-10
**الحالة:** اقتراح استراتيجي للمراجعة
**الهدف:** الخروج من صورة “برنامج مغسلة” إلى “منظومة تشغيل أي مشروع تشغيلي”

---

## 1) لماذا الآن؟

**الوضع الحالي:**
- الكود بالفعل يدعم أكثر من نوع نشاط (business_type = laundry, dry_cleaning, linen_service, carpet_cleaning, tailoring, other)
- يوجد `workflow_stages` و `workflow_templates` لـ 6 أنواع أنشطة
- يوجد Multi-Currency, Self-Service Onboarding, Branch separation
- لكن الواجهة كلها بتتكلم “مغسلة، طلب، قطعة، كي، تغليف...” → تحصرنا في سوق المغاسل فقط

**الفرصة:**
- نفس المحرك (Orders → Stages → Staff → Cash → Accounting → Reports) يشتغل لـ:
  - مغاسل ملابس وسجاد (موجود)
  - غسيل سيارات
  - ورش تصليح (موبايل، أجهزة، سيارات)
  - شركات تنظيف منازل ومكاتب
  - مطاعم توصيل فقط (Dark Kitchen)
  - مراكز خياطة وتعديل
  - مخازن صغيرة + توصيل

**التمييز:** كل المنافسين بيبنوا “برنامج مغسلة” أو “برنامج ورشة”. إحنا بنبني **منصة تشغيل** — صاحب المشروع هو اللي بيعرّف المراحل بتاعته.

---

## 2) الرؤية الجديدة

### Slogan الحالي:
> “نظام إدارة مغاسل”

### Slogan المقترح:
> **MJRH — منظومة تشغيل المشاريع التشغيلية**
> **One Platform. Any Operation. From Intake to Cash.**

### التعريف:
- **المشروع (Project/Tenant):** أي كيان تشغيلي مستقل (مغسلة، ورشة، مطعم...)
- **العملية (Job/Order):** الوحدة التشغيلية اللي بتمر بمراحل
- **المرحلة (Stage):** محطة العمل اللي بيعرّفها المالك
- **الوحدة (Unit):** البند داخل العملية (قطعة ملابس، سيارة، جهاز...)

---

## 3) قاموس المصطلحات — من مغسلة إلى مشروع

| القديم (مغسلة فقط) | الجديد (عام + قابل للتخصيص) | في الكود |
|---|---|---|
| مغسلة | مشروع / Project / Tenant | `tenants.name` |
| طلب | عملية / مهمة / Job | `orders` → `jobs` (alias) |
| قطعة / وحدة خدمة | بند / وحدة / Item | `service_units` → `job_items` (alias) |
| عميل مغسلة | عميل / Customer | `customers` |
| مرحلة كي/تغليف | مرحلة تشغيل / Stage | `workflow_stages` ✅ موجود |
| فرع مغسلة | موقع تشغيل / Location | `branches` → `locations` (alias) |
| مندوب مغسلة | فريق توصيل / Crew | `employees` |
| خزنة | خزنة / حساب / Account | `cash_accounts` |

**الاستراتيجية:** لا نغير أسماء الجداول في الـ DB الآن (تجنباً للكسر)، لكن نغير كل الـ UI Labels عبر `i18n` فقط. مثلاً:
- `orders` في الكود، لكن في الواجهة نعرض “العمليات” أو “المهام” حسب نوع المشروع
- `service_units` في الكود، لكن نعرض “البنود” أو “القطع” حسب القالب

---

## 4) الهيكلة المقترحة — 3 طبقات

```
Layer 1: Platform Core (موجود 90%)
  - Multi-tenant, Auth, RLS, Branch/Location separation
  - Cash, Accounting (double-entry), Payroll, Inventory
  - Staff, Roles, Attendance, Scoring
  - Customer CRM, Tracking, Payments, WhatsApp
  - Reports, APDO, System Health, Telemetry
  → هذا عام 100% لأي مشروع

Layer 2: Industry Templates (موجود 70% — يحتاج تحسين UI)
  - كل Template يعرّف: workflow stages, default services, roles, features
  - 6 Templates جاهزة:
    🧺 Laundry (موجود كامل)
    🧹 Carpet (موجود)
    🔧 Repair Workshop (موجود)
    🚗 Car Wash (موجود)
    🏠 Home Cleaning (موجود)
    🍽️ Restaurant Delivery (موجود)
  → المالك يختار قالب عند التسجيل، ثم يقدر يعدل

Layer 3: Customization (قيد التنفيذ 30%)
  - Custom Stages: /settings/workflow ✅ موجود
  - Custom Fields per service (مثلاً “نوع القماش”، “موديل السيارة”) — جديد
  - Custom Status Flow (حالات العملية) — جديد
  - Custom Roles & Permissions matrix — جديد
  - Category Management (فئات الخدمات) — يحتاج UI
```

---

## 5) التغييرات المطلوبة في الواجهة — Quick Wins (1-2 أسبوع)

### أ) Landing Page `/landing`
**حالياً:** “نظام تشغيل المغاسل — من أول قطعة لحد آخر جنيه”
**مقترح:**
- Hero: “منظومة واحدة تشغّل أي مشروع تشغيلي — من أول طلب لحد إقفال الخزنة”
- 6 كروت للأنشطة (كما في workflow_templates) بدل التركيز على المغسلة فقط
- CTA: “أنشئ مشروعك في دقيقتين — اختر نشاطك”

### ب) Signup `/signup`
**حالياً:** يسأل “اسم المغسلة” + “نوع النشاط” لكن الـ label مغسلة
**مقترح:**
- Step 1: “اسم مشروعك” + “رابط مشروعك” + “مجال عملك” (Grid من 6 كروت بأيقونات كبيرة)
- Step 2: بيانات المالك
- Step 3: “تم إنشاء مشروعك! اختر قالب المراحل” → يفتح `/settings/workflow` مباشرة

### ج) Sidebar
**حالياً:** مجموعات باسم “إدارة المالك والتنفيذيين (Vorstand)” و “إدارة المغاسل...” — طويلة وألماني
**مقترح — 4 مجموعات فقط عامة:**
1. **الرئيسية (Today):** اليوم، العمليات، الخريطة، التقارير
2. **التشغيل (Operations):** المحطات (ديناميكية من workflow_stages)، الفروع/المواقع، المخزون
3. **العملاء والمبيعات:** العملاء، CRM، البحث، الخدمات/المنتجات
4. **المالية والإدارة:** الخزنة، المحاسبة، الميزانية، الموظفين، الإعدادات، workflow

**الميزة:** لما المالك يغير workflow_stages، الـ Sidebar يتحدث تلقائياً (يقرأ من DB).

### د) مصطلحات عامة في `i18n`
- `nav./orders` من “كل الطلبات والفواتير” → “كل العمليات”
- `nav./stations/*` من “الكي، التغليف...” → يقرأ من `workflow_stages.name`
- `settings.pageTitle` من “إعدادات المغسلة” → “إعدادات المشروع”
- `common.egp` → يستخدم `useCurrency()` (تم إصلاحه)

---

## 6) تغييرات تقنية — بدون كسر (Backward Compatible)

| المنطقة | الوضع الحالي | المقترح | جهد |
|---|---|---|---|
| `tenants.business_type` | enum محدود (laundry, etc) | يبقى، لكن نضيف `industry_profile JSONB` لتخزين template مختار وحقول مخصصة | صغير |
| `orders.status` | enum هاردكود (received, cleaning, ironing...) | نضيف جدول `order_statuses` قابل للتخصيص، لكن نحتفظ بـ enum كـ fallback | متوسط |
| `service_type` | cleaning / ironing / both | يبقى، كافي لمعظم الأنشطة. لورشة → نستخدم both = “يحتاج تشخيص وتصليح” | صغير |
| `workflow_stages` | ✅ موجود | نربط Sidebar و Station Pages به مباشرة بدل هاردكود | متوسط |
| `service_items.category` | لا يوجد جدول فئات | نضيف `service_categories` table + UI في `/services` | صغير |
| `app_settings` | فيه business_name, currency فقط | نضيف logo, primary_color, receipt_footer — لكل مشروع | صغير |

---

## 7) خطة التنفيذ — 3 مراحل

### المرحلة 1: Rebrand UI Only (الأسبوع 1-2) — صفر خطر
- [ ] تغيير كل نصوص الواجهة من “مغسلة” إلى “مشروع” عبر `i18n-internal.ts` (استخدم find/replace مدروس)
- [ ] صفحة Landing جديدة عامة (6 كروت أنشطة)
- [ ] Signup يظهر 6 Templates كـ Cards كبيرة
- [ ] Sidebar 4 مجموعات عامة + ديناميكية من workflow_stages
- [ ] `index.html` title من “نظام إدارة مغاسل” إلى “منظومة تشغيل المشاريع — MJRH Industrial Revolution”
- [ ] لا تغيير DB

**النتيجة:** أي عميل جديد يشوف “منصة مشاريع”، والعميل القديم (Dry Tech) يفضل شغال بدون كسر.

### المرحلة 2: Generic Engine (الأسبوع 3-6) — متوسط خطر
- [ ] جعل `/stations/*` ديناميكية: `/stations/[slug]` تقرأ من `workflow_stages`
- [ ] إضافة `service_categories` CRUD
- [ ] إضافة `custom_fields` لـ service_items (JSONB)
- [ ] ربط `seed_tenant_defaults` بـ `apply_workflow_template` حسب business_type المختار

**النتيجة:** المالك يقدر يضيف/يحذف مرحلة ويشوفها فوراً في Sidebar والمحطات.

### المرحلة 3: Template Marketplace (الأسبوع 7-10)
- [ ] صفحة `/admin/templates` لإدارة قوالب المنصة (Super Admin)
- [ ] صفحة `/marketplace` للعملاء لاستيراد قوالب جاهزة
- [ ] Custom Roles matrix UI
- [ ] Export/Import workflow كـ JSON

---

## 8) التسعير الجديد المقترح

| الخطة | للمنصة العامة | لمغسلة فقط (حالي) |
|---|---|---|
| **Starter** | مشروع واحد، فرع واحد، 500 عملية/شهر — **$29** | نفس |
| **Growth** | 3 فروع، 3000 عملية/شهر، تقارير متقدمة — **$79** | نفس |
| **Enterprise** | فروع غير محدودة، Workflow مخصص، API — **$199** | نفس |

ميزة: لا نغير التسعير، فقط نغير الوصف من “مغسلة” إلى “مشروع”.

---

## 9) المخاطر وكيف نتجنبها

| الخطر | الحل |
|---|---|
| عملاء المغاسل الحاليين يحسوا أننا تركنا مجالهم | نحتفظ بـ “Laundry” كـ Template أول وأكبر، ونظهره في Landing كـ Featured |
| كسر تشغيل Dry Tech أثناء التعديل | كل تغيير DB يكون `IF NOT EXISTS` + `security_invoker` + forward repair migration |
| اللغة تصبح عامة جداً فتفقد الهوية | نستخدم “العمليات” كمصطلح عام، لكن داخل كل Template نستخدم مصطلحاته الخاصة (مثلاً في قالب مغسلة نعرض “الكي”، في قالب ورشة نعرض “التصليح”) |

---

## 10) ماذا نعمل الآن؟ (اقتراحي)

**اختر مسارين:**

**المسار الأسرع (أنصح به):**
1. أبدأ المرحلة 1 فقط — إعادة صياغة النصوص والـ Landing — بدون أي تغيير DB — خلال 48 ساعة
2. النتيجة: تقدر تبيع لعميل “ورشة موبايلات” أو “مطعم” بنفس النظام الحالي

**المسار العميق:**
- إذا وافقت على الاقتراح كامل، أبدأ بتنفيذ المرحلة 1+2 معاً (3 أسابيع) مع ضمان عدم كسر تشغيل Dry Tech

---

## 11) ملحق — أمثلة عناوين جديدة

- **القديم:** `/stations/ironing` → “محطة الكي”
- **الجديد المقترح:** `/stations/ironing` → يظهر “الكي” لو مشروعك مغسلة، ويظهر “التلميع” لو مشروعك غسيل سيارات — لأن الاسم يأتي من `workflow_stages.name`

- **القديم:** `nav./orders` → “كل الطلبات والفواتير”
- **الجديد:** “كل العمليات” + Badge بعدد المتأخر

---

**الخلاصة:** المنصة بالفعل 70% جاهزة لتكون منصة مشاريع. اللي ناقص هو **إعادة تغليف اللغة والواجهة** فقط في البداية، ثم تعميم المحطات ديناميكياً. لا نحتاج إعادة بناء من الصفر.

*جاهز لبدء المرحلة 1 فور موافقتك.*
