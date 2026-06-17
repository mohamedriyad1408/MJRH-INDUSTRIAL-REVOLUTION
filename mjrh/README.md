# MJRH — نظام إدارة المغاسل
## (Dry Tech → MJRH Upgrade)

---

## الملفات الجديدة والمعدلة

### ملفات جديدة (أضفها للمشروع)
| الملف | الوصف |
|-------|-------|
| `src/routes/_app/driver.tsx` | لوحة السائق — استلام + توصيل |
| `src/routes/_app/live-map.tsx` | خريطة المراقبة الحية + خط السير |
| `src/routes/_app/budgets.tsx` | نظام الميزانيات المالية |
| `src/routes/customer-portal.tsx` | بوابة العميل (خارج الـ _app layout) |

### ملفات معدلة (استبدلها بالكامل)
| الملف | التغييرات |
|-------|-----------|
| `src/routes/_app/stations/reception.tsx` | ربط Pickups + فصل مصادر الطلبات |
| `src/routes/track.$token.tsx` | صفحة تتبع مرئية للعميل |
| `src/components/app-sidebar.tsx` | إضافة 4 روابط جديدة + تغيير الاسم لـ MJRH |

---

## خطوات التطبيق

### 1. Supabase Migrations (مهم أولاً)
افتح Supabase Dashboard > SQL Editor
انسخ محتوى `SUPABASE_MIGRATIONS.sql` والصقه واضغط Run

### 2. رفع الملفات على GitHub
- أضف الملفات الجديدة: `driver.tsx`, `live-map.tsx`, `budgets.tsx`, `customer-portal.tsx`
- استبدل الملفات المعدلة

### 3. تغيير اسم المشروع
في Lovable > Settings > Rename project > اكتب MJRH

### 4. بوابة العميل
الرابط: `yourapp.com/customer-portal`
العميل يدخل برقم هاتفه المسجل

---

## ما الذي تغير في كل ملف؟

### driver.tsx (جديد كلياً)
- تاب استلام: pickups مفتوحة → السائق يأخذها → تأكيد الاستلام → order تلقائي
- تاب توصيل: طلبات جاهزة للسائق ده بس + تأكيد التسليم بكود هاتف العميل

### live-map.tsx (جديد)
- خريطة Leaflet مجانية (بدون API key)
- جيوكودينج تلقائي للعناوين عبر Nominatim
- أيقونات ملونة: 📦 استلام، 🏠 توصيل، 🚗 سائق
- تحديث كل 30 ثانية
- تحديد نقاط متعددة → رسم خط السير

### budgets.tsx (جديد)
- إنشاء ميزانية شهرية/أسبوعية
- ربط تلقائي بالإيرادات والمصروفات الفعلية من Supabase
- progress bars + ألوان (أخضر/أحمر)
- تفصيل بنود المصروفات

### customer-portal.tsx (جديد)
- تسجيل دخول برقم الهاتف (بدون password)
- عرض الطلبات النشطة والسابقة
- progress bar مرئي لمراحل الطلب
- طلب جديد: اختيار خدمات + كميات + ملاحظات + رفع صور
