# مهمة الوكيل: مراجعة استقرار Dry-Tech + Super Admin (قبل النقل)

**التعليمات العامة:**

- لا تقم بتعديل أي كود حتى ننتهي من المراجعة.

- الهدف هو **تحديد** كل نقطة فشل، وليس إصلاحها الآن.

- سجل كل شيء في تقرير واحد (انظر نموذج التقرير أدناه).

---

## المرحلة ١: فحص الكود المصدري (بحث عن تسريبات V4)

**المطلوب:** فتح الـ Terminal في جذر المشروع، وتشغيل الأوامر التالية، وتدوين المخرجات.

| الأمر | الهدف |

| :--- | :--- |

| `grep -rn "from.*core" ./src --include="*.ts" --include="*.tsx"` | العثور على كل استيراد من `core` (V4). |

| `grep -rn "from.*modules" ./src --include="*.ts" --include="*.tsx"` | العثور على كل استيراد من `modules` (V4). |

| `grep -rn "from.*routes" ./src --include="*.ts" --include="*.tsx"` | العثور على استيرادات `routes` الخاصة بـ V4. |

| `grep -rn "from.*golden-minds" ./src --include="*.ts" --include="*.tsx"` | العثور على استيرادات Golden Minds (إن وجدت). |

| `grep -rn "fn_evaluate_readiness" ./src --include="*.ts" --include="*.tsx"` | البحث عن دوال L3 المستخدمة في المكان الخطأ. |

**المخرجات المتوقعة:** قائمة بالملفات + رقم السطر + الاستيراد المحدد.

---

## المرحلة ٢: فحص قاعدة البيانات (Supabase)

**المطلوب:** الدخول إلى SQL Editor في Supabase، وتشغيل الاستعلامات التالية:

```sql

-- 1. التحقق من وجود الجداول الأساسية لـ V2/V3

SELECT table_name 

FROM information_schema.tables 

WHERE table_schema = 'public' 

AND table_name IN ('profiles', 'tenants', 'orders', 'customers', 'employees', 'inventory', 'roles', 'permissions');

-- 2. البحث عن أي جداول خاصة بـ V4 (للتأكد من أنها ليست مفقودة إذا كان الكود يستدعيها)

SELECT table_name 

FROM information_schema.tables 

WHERE table_schema = 'public' 

AND table_name LIKE '%capability%' OR table_name LIKE '%genome%';

-- 3. التحقق من دوال V4 (مثل fn_evaluate_readiness)

SELECT proname, prosrc 

FROM pg_proc 

WHERE proname LIKE 'fn_%' OR proname LIKE 'eval%';

```

المخرجات المتوقعة: قائمة بالجداول والدوال الموجودة مقابل المفقودة.

---

المرحلة ٣: الاختبار اليدوي عبر المتصفح (على [mjrh.vercel.app](http://mjrh.vercel.app))

تعليمات التشغيل:

1. افتح المتصفح في وضع التصفح المتخفي (Incognito) لتجنب الكاش.

2. افتح أدوات المطور (F12) -> تبويب Console.

3. انتقل إلى كل مسار من المسارات التالية، وسجل أي خطأ أحمر (Red Error) يظهر في الـ Console.

قائمة المسارات:

# المسار الوظيفة المطلوبة

1 /_admin هل تظهر صفحة تسجيل الدخول؟ هل هناك أخطاء؟

2 /_admin/dashboard هل تظهر الإحصائيات؟

3 /_admin/tenants هل تظهر قائمة المستأجرين؟

4 /[TENANT_ID_FAKE]/dashboard (اختر Tenant موجود) هل تظهر لوحة التحكم؟

5 /[TENANT_ID_FAKE]/orders هل تظهر الطلبات؟

6 /[TENANT_ID_FAKE]/customers هل يظهر العملاء؟

7 /[TENANT_ID_FAKE]/employees هل يظهر الموظفون؟

8 /[TENANT_ID_FAKE]/reports هل تظهر التقارير؟

المخرجات المتوقعة: لكل صفحة، اكتب "تعمل" أو "فشلت" مع نسخ نص الخطأ.

---

المرحلة ٤: فحص الشبكة (Network Tab)

المطلوب: في تبويب Network، قم بتصفية (Filter) للطلبات التي ترد بـ 404 أو 500 أو 403.

المخرجات المتوقعة: قائمة بالـ Endpoints الفاشلة (مثل: /api/..., /functions/...).

---
