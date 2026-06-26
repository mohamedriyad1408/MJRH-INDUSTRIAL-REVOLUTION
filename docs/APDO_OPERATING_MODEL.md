# MJRH — Actor / Process / Data / Output Operating Model

آخر تحديث: 2026-06-26

هدف هذا النموذج أن أي عملية داخل النظام لا تكون مجرد زر أو شاشة، بل تسجل وتظهر إجابات الخمس أسئلة الأساسية:

1. حدثت في أي فرع؟
2. أثرت على أي خزنة؟ أو لا يوجد أثر خزنة؟
3. هل أنشأت قيدًا؟ أو لا تحتاج قيدًا؟
4. هل ظهرت في التقرير المناسب؟
5. هل تحتاج إشعارًا؟ وهل تم إنشاء الإشعار؟

---

## 1) Actor

هو الشخص أو النظام الذي نفذ العملية.

أمثلة:

- Owner
- Ops Manager
- CS Manager
- Receptionist
- Driver
- System / Trigger / Edge Function

يتم تمثيله في قاعدة البيانات داخل `operation_events.actor_id`، وفي العمليات الآلية يمكن حفظ تفاصيل إضافية داخل `data`.

---

## 2) Process

هو اسم العملية وليس اسم الصفحة.

أمثلة:

- `order_created` — إنشاء طلب.
- `expense_created` — تسجيل مصروف.
- `inventory_item_created` — إضافة صنف مخزون.
- `inventory_movement` — حركة مخزون.
- `cash_transfer` — تحويل بين خزن.
- `cash_closing` — إقفال خزنة.
- `payroll_payment` — صرف راتب.

كل عملية يتم تسجيلها أو يمكن مراجعتها في:

```txt
operation_events
operation_answer_matrix
```

---

## 3) Data

هي المدخلات الأساسية للعملية:

- `tenant_id`
- `branch_id`
- `source_type`
- `source_id`
- `cash_account_id` عند وجود أثر خزنة.
- المبلغ/الكمية/الحالة/الوصف داخل `data`.

قاعدة عامة:

```txt
أي عملية تشغيلية أو مالية بدون branch_id تعتبر ناقصة.
أي عملية نقدية بدون cash_account_id تعتبر ناقصة.
```

---

## 4) Output

هي نتيجة العملية:

- هل أثرت على خزنة؟ `cash_impact`
- هل تحتاج قيدًا؟ `journal_required`
- هل تظهر في تقرير؟ `appears_in_report`
- أين تظهر؟ `report_bucket`
- هل تحتاج إشعارًا؟ `requires_notification`
- هل تم إنشاء إشعار؟ `notification_id`

---

## 5) Audit / Answer Matrix

تم إضافة migration:

```txt
20260626123000_apdo_operation_framework.sql
```

وتضيف:

- `operation_events`
- `operation_answer_matrix`
- `record_operation_event(...)`
- `expenses.cash_account_id`
- `pickup_requests.branch_id`
- `equipment_assets.branch_id`
- `app_notifications.branch_id`

### مثال قراءة العمليات الناقصة

```sql
SELECT *
FROM public.operation_answer_matrix
WHERE branch_answer <> 'answered'
   OR cash_answer = 'missing_cash_account'
   OR journal_answer = 'missing_journal'
   OR report_answer <> 'answered'
   OR notification_answer = 'missing_notification'
ORDER BY created_at DESC;
```

---

## 6) قواعد تنفيذ أي ميزة جديدة

قبل قبول أي feature، لازم تتأكد من الآتي:

```txt
Actor: مين نفذ؟
Process: ما اسم العملية؟
Data: الفرع والخزنة والمصدر والبيانات؟
Output: قيد/تقرير/إشعار؟
```

ثم تجيب الخمس أسئلة:

```txt
حدثت في أي فرع؟
أثرت على أي خزنة؟
هل أنشأت قيدًا؟
هل ظهرت في التقرير؟
هل تحتاج إشعارًا؟
```

---

## 7) ما تم ربطه في الواجهة

### المصروفات `/finance`

- فلتر فرع.
- اختيار فرع عند إضافة مصروف.
- اختيار حالة المصروف: مدفوع أو آجل.
- اختيار خزنة إذا كان مدفوعًا.
- إنشاء حركة خزنة للمصروف المدفوع.
- تسجيل `operation_event` يوضح الفرع والخزنة والتقرير والقيد المطلوب.

### المخزون `/inventory`

- فلتر فرع.
- اختيار فرع عند إضافة صنف.
- ربط حركة المخزون بالفرع.
- ربط المعدات بالفرع.
- تسجيل `operation_event` لإضافة الصنف وحركات المخزون.

### الفروع في صفحات التشغيل والتحليل

- `/today` مركز اليوم.
- `/reports` التقارير.
- `/accounting` الخزنة والرواتب.
- `/finance` المالية.
- `/inventory` المخزون.

---

## 8) المتبقي لتغطية APDO بالكامل

- تسجيل `operation_events` لعمليات الطلبات المهمة: إنشاء، اعتماد فاتورة، تحصيل، إلغاء، تسليم.
- تسجيل APDO للتحويل بين الخزن وإقفال الخزن.
- فلترة وربط الخريطة والمندوبين بـ `branch_id` بالكامل.
- إضافة شاشة فحص APDO تعرض العمليات الناقصة من `operation_answer_matrix`.
- تعديل RPCs المهمة لتقبل `branch_id` و `cash_account_id` صراحة بدل الاعتماد على تحديث لاحق.
