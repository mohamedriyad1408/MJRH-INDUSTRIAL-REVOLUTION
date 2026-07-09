# MJRH — خطة النظام القابل للتكوين (Configurable Platform)
## أي صاحب مشروع في أي دولة يقدر يظبط الـ Workflow بتاعه

**التاريخ:** 2026-07-09
**الهدف:** تحويل MJRH من نظام مغاسل مخصص لـ Platform قابل للتكوين لأي نشاط خدمي

---

## 1. الرؤية

```
حالياً:    MJRH = نظام مغاسل فقط (hardcoded workflow)
المطلوب:   MJRH = Platform يقدر أي صاحب مشروع يظبطه لنشاطه
```

**أمثلة على النشاطات اللي المفروض تشتغل:**

| النشاط | Workflow المطلوب |
|---|---|
| مغسلة ملابس | استلام → غسيل → كي → تغليف → تسليم |
| مغسلة سجاد | استلام → غسيل → تجفيف → تغليف → تسليم |
| خدمة مفروشات فندقية | طلب → غسيل → كي → تغليف → تسليم للفندق |
| ورشة تصليح | استلام → تشخيص → تصليح → فحص → تسليم |
| غسيل سيارات | حجز → غسيل → تلميع → تسليم |
| خدمة تنظيف منازل | حجز → فريق → تنظيف → فحص → اعتماد |
| مطعم (delivery only) | طلب → تحضير → تغليف → تسليم |

---

## 2. الآلية المقترحة

### 2.1 المرحلة الأولى: Custom Workflow Builder (أولوية عالية)

**الفكرة:** المالك يقدر يعرّف محطات العمل بتاعته من صفحة الإعدادات.

**التنفيذ:**

#### أ) جدول `workflow_stages` (جديد)

```sql
CREATE TABLE workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,           -- اسم المحطة (e.g., "الغسيل")
  name_en TEXT,                 -- الاسم بالإنجليزي
  slug TEXT NOT NULL,           -- رابط (e.g., "cleaning")
  stage_order INTEGER NOT NULL, -- ترتيب المحطة (1, 2, 3...)
  icon TEXT,                    -- أيقونة (e.g., "Sparkles")
  color TEXT,                   -- لون (e.g., "#3b82f6")
  is_active BOOLEAN DEFAULT true,
  requires_assignment BOOLEAN DEFAULT true,  -- هل محتاج تعيين فني؟
  auto_move_on_complete BOOLEAN DEFAULT false, -- هل يتحول تلقائياً؟
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### ب) صفحة `/settings/workflow` (جديدة)

```
┌─────────────────────────────────────────────┐
│  إعدادات مراحل العمل                        │
│                                             │
│  [إضافة مرحلة جديدة]                       │
│                                             │
│  ┌─ 1. الاستلام ──────────────────────────┐ │
│  │  الاسم: الاستلام                        │ │
│  │  Slug: reception                         │ │
│  │  الأيقونة: 📦                           │ │
│  │  [تعديل] [حذف] [↑] [↓]                 │ │
│  └──────────────────────────────────────────┘ │
│  ┌─ 2. الغسيل ────────────────────────────┐ │
│  │  الاسم: الغسيل                          │ │
│  │  Slug: cleaning                          │ │
│  │  الأيقونة: ✨                           │ │
│  │  [تعديل] [حذف] [↑] [↓]                 │ │
│  └──────────────────────────────────────────┘ │
│  ┌─ 3. الكي ──────────────────────────────┐ │
│  │  ...                                     │ │
│  └──────────────────────────────────────────┘ │
│                                             │
│  [حفظ الترتيب]                               │
└─────────────────────────────────────────────┘
```

#### ج) Templates جاهزة (Quick Setup)

```
┌─────────────────────────────────────────────┐
│  اختر قالب نشاطك أو ابدأ من الصفر          │
│                                             │
│  [🧺 مغسلة ملابس]  [🧹 مغسلة سجاد]        │
│  [🏨 مفروشات فندقية] [🔧 ورشة تصليح]       │
│  [🚗 غسيل سيارات]   [🏠 تنظيف منازل]       │
│  [🍽️ مطعم توصيل]   [📐 مخصص من الصفر]     │
│                                             │
└─────────────────────────────────────────────┘
```

كل template بتنشئ محطات جاهزة:
- **مغسلة ملابس:** استلام → فرز → غسيل → تجفيف → كي → تغليف → جودة → تسليم
- **مغسلة سجاد:** استلام → غسيل → تجفيف → تغليف → تسليم
- **ورشة تصليح:** استلام → تشخيص → تصليح → فحص → تسليم
- **غسيل سيارات:** حجز → غسيل → تلميع → فحص → تسليم
- etc.

---

### 2.2 المرحلة الثانية: Custom Fields & Services (أولوية عالية)

**الفكرة:** المالك يقدر يعرّف الخدمات والأسعار بتاعته.

**الحالة الحالية:** ✅ موجود بالفعل!
- صفحة `/services` بتسمح بإضافة/تعديل/حذف خدمات
- جدول `service_items` قابل للتخصيص
- فئات (`category`) قابلة للتعديل

**اللي ناقص:**
- واجهة لإدارة الفئات (حالياً hardcoded: رجالي، حريمي، أطفال...)
- إمكانية إضافة حقول مخصصة لكل خدمة (e.g., "نوع القماش"، "لون")

---

### 2.3 المرحلة الثالثة: Custom Status Flow (أولوية متوسطة)

**الفكرة:** المالك يقدر يعرّف حالات الطلب والتحولات بينها.

**الحالة الحالية:** الحالات hardcoded في الـ enum:
```sql
order_status: received, cleaning, ironing, packing, ready, out_for_delivery, delivered, cancelled
```

**المطلوب:**
```sql
CREATE TABLE order_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  is_initial BOOLEAN DEFAULT false,  -- هل هي الحالة الأولى؟
  is_final BOOLEAN DEFAULT false,    -- هل هي الحالة النهائية？
  is_cancelled BOOLEAN DEFAULT false,
  status_order INTEGER,
  allowed_transitions UUID[]         -- الحالات اللي ممكن يتحول ليها
);
```

---

### 2.4 المرحلة الرابعة: Custom Roles & Permissions (أولوية متوسطة)

**الفكرة:** المالك يقدر يعرّف أدوار الموظفين وصلاحياتهم.

**الحالة الحالية:** الأدوار hardcoded:
```
owner, ops_manager, cs_manager, employee, courier, customer
```

**المطلوب:**
```sql
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,              -- e.g., "فني كي"، "مدير الفرع"
  slug TEXT NOT NULL,
  permissions JSONB NOT NULL,      -- { "can_create_orders": true, "can_view_reports": false, ... }
  is_active BOOLEAN DEFAULT true
);
```

---

### 2.5 المرحلة الخامسة: Industry-Specific Modules (أولوية منخفضة)

**الفكرة:** كل نشاط له modules إضافية.

| النشاط | Module الإضافي |
|---|---|
| مغسلة | Ironing Payroll، Reclean Returns، Label Tracking |
| ورشة تصليح | Parts Inventory، Repair Quotes، Warranty Tracking |
| غسيل سيارات | Wash Packages، Loyalty Cards，Queue Management |
| مطعم | Menu Management، Kitchen Display، Delivery Tracking |

---

## 3. خطة التنفيذ

### Phase 1: Workflow Builder (4-6 أسابيع)

```
الأسبوع 1-2:  جدول workflow_stages + Migration + RPC
الأسبوع 3-4:  صفحة /settings/workflow + Templates
الأسبوع 5-6:  ربط المحطات الديناميكية بالـ Station Pages
```

### Phase 2: Custom Fields (2-3 أسابيع)

```
الأسبوع 1:    واجهة إدارة الفئات
الأسبوع 2-3:  Custom fields per service
```

### Phase 3: Custom Status Flow (3-4 أسابيع)

```
الأسبوع 1-2:  جدول order_statuses + Migration
الأسبوع 3-4:  واجهة تعديل الحالات + ربط بالـ workflow
```

### Phase 4: Custom Roles (2-3 أسابيع)

```
الأسبوع 1-2:  جدول custom_roles + Permission matrix
الأسبوع 3:    واجهة إدارة الأدوار
```

---

## 4. التأثير على البنية الحالية

| الملف/الجدول | التأثير |
|---|---|
| `lib/station-workflow.ts` | يقرأ المحطات من DB بدل hardcoded |
| `routes/$tenant/stations/*.tsx` | تتحول لـ dynamic routes |
| `components/station-board.tsx` | يقرأ المحطات من DB |
| `app-sidebar.tsx` | يقرأ المحطات من DB |
| `order_status` enum | يتحول لـ table |
| `service_type` enum | يبقى (cleaning/ironing/both كافية) |

---

## 5. القيد الأساسي

**لا نكسر التشغيل الحالي.** أي تغيير لازم يكون:
- backward-compatible
- يشتغل مع البيانات الموجودة
- لا يوقف production

**الاستراتيجية:** نضيف الـ tables الجديدة، نعمل migration للبيانات الموجودة، وبعدين نبطئ نشيل الـ hardcoded values.

---

*آخر تحديث: 2026-07-09*
