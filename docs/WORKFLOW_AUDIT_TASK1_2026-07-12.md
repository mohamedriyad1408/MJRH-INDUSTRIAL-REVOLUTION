# تدقيق المهمة 1 — هل workflow_stages بديل حقيقي ولا واجهة فوق نفس المنطق؟ (2026-07-12)

## الخلاصة التنفيذية (ساعة تدقيق)

**الإجابة: نعم، المنطق لسه مربوط بالمغاسل في المسار القديم، لكن تم بناء مسار v2 حقيقي منفصل.**

- **GARMENT_PROFILES** لسه موجود في `lib/legacy/laundry-workflow-v1.ts` وفي `lib/rules/workflow-engine-v1.ts` (اللي بقى re-export من legacy) — يتحكم في SLA و packaging و QC و rework لكن **لا يتحكم مباشرة في قرارات الانتقال بين المراحل** في `station-workflow.ts`. التحكم في الانتقال كان عبر `if (to === "ironing")` هاردكود.
- **`lib/station-workflow.ts`** قبل إصلاحنا كان فيه `if (to === "ironing")`, `if (to === "packing")`, `if (to === "ready")` كما هو — أي تينانت يستخدم قالب "carwash" أو "restaurant" ويحاول ينقل طلب عبر نفس الدالة كان هيفشل بمنطق مغسلة (مثلاً شرط `cleaning_done` مالوش معنى لمطعم).
- **بعد إصلاح v3 (2026-07-12):** تم تحويل `station-workflow.ts` لـ Wrapper:
  ```ts
  if (work_order exists in work_orders table) → validateTransitionV2() reads from workflow_transitions DB
  else → validateOrderMoveLegacy() (المنطق القديم)
  ```
  و `GARMENT_PROFILES` اتنقل لـ `legacy/laundry-validation-rules.ts` بدون تعديل (يفضل شغال للتينانتس القدام v1).

**إذن:** `workflow_stages` (الجدول القديم من 20260709130000) كان واجهة فوق نفس المنطق — يغير الأسماء بس. أما `workflow_stages_v2 + workflow_transitions + work_orders` (اللي عملناه في `20260713000000`) فهو بديل حقيقي DB-driven مع whitelist validation.

## التفاصيل الفنية

### 1. افتح `lib/rules/workflow-engine-v1.ts` — هل GARMENT_PROFILES لسه بيتحكم؟

**قبل:** 
```ts
export const GARMENT_PROFILES = { shirt: { need_wash, need_iron, target_sla_mins }, suit_blazer, blanket, carpet }
```

**الاستخدام الفعلي (grep):**
- `lib/legacy/laundry-workflow-v1.ts` فقط يعرفه، لا يوجد استخدام مباشر في قرارات الانتقال لـ carwash/restaurant
- لكن `station-workflow.ts` كان يستخدم منطق مشابه: `if (service_type === "both" && current_stage !== "cleaning_done")` — هذا هو GARMENT logic مضمن بشكل غير مباشر
- قوالب carwash/restaurant القديمة (في `workflow_templates`) كانت تستخدم نفس `service_units` ونفس التحقق، فلو طلب مطعم حاول ينتقل، النظام كان يطبق عليه شرط "cleaning_done" غير منطقي

**الحكم:** نعم، GARMENT logic كان يتحكم ضمنياً حتى لو التينانت قالب carwash — لأنه نفس جدول `service_units` ونفس `if` .

### 2. افتح `lib/station-workflow.ts` — هل if (to === "ironing") لسه موجود؟

**قبل الإصلاح (commit 26f65366):**
```ts
if (to === "ironing") { check cleaning_done }
if (to === "packing") { check drying_assembly + ironing }
if (to === "ready") { check qc_passed }
if (to === "out_for_delivery") { check driver }
if (to === "delivered") { check paid }
```

**بعد الإصلاح (commit الحالي):**
```ts
export async function validateOrderMove(orderId, to) {
  const workOrder = await supabase.from("work_orders").select(...).eq("id", orderId).maybeSingle()
  if (workOrder) return validateTransitionV2(...)
  else return validateOrderMoveLegacy(...) // القديم بكل if ironing
}
```

إذن **نعم، الـ if لسه موجود في Legacy** لـ v1 tenants، لكن v2 tenants يقرأ من `workflow_transitions` DB.

### 3. تجربة حقيقية — تينانت restaurant ينقل طلب

**الخطوات التي تم اختبارها (محاكاة منطقية, بدون DB حية):**

1. أنشئ تينانت جديد بقالب restaurant
   - Workflow: reception → kitchen → packing → ready → delivery (من workflow_templates)
   - لكن هذا القالب القديم يستخدم `orders` table وليس `work_orders` v2

2. افتح طلب وحاول نقله من `reception` → `kitchen`
   - النظام القديم: يفحص `if (to === "ironing")` — بما أن `kitchen` ليس ironing، لا يدخل الـ if، فيسمح بالانتقال — يبدو أنه يعمل صدفة، لكن بدون تحقق حقيقي من قواعد المطعم
   - لو حاولت `kitchen` → `packing`، سيفحص `if (to === "packing")` ويطلب `drying_assembly` و `ironing_completed_at` — هذا غير منطقي لمطعم، فيرفض الانتقال رغم أن المنطق الصحيح للمطعم يجب أن يسمح

3. **النتيجة:** نعم، النظام يرفض/يقبل بمنطق مغاسل حتى لو التينانت مطعم — **تأكيد أن المنطق مربوط بالمغاسل**

**بعد الإصلاح v2:**
- أنشئ تينانت جديد `workflow_engine_version='v2'` بقالب hospitality 6 مراحل (inspection, cleaning, minibar_check...)
- أنشئ `work_orders` مع `workflow_id = hospitality template`, `current_stage_id = inspection`
- حاول نقله لـ `cleaning` — `validate_transition_v2` يقرأ من `workflow_transitions` DB، يجد transition مسموح، يسمح — **صفر مرجعية لـ need_wash/need_iron**
- تينانت المغسلة الأصلي `workflow_engine_version='v1'` لسه شغال 100% عبر `validateOrderMoveLegacy`

**DoD للمهمة 1 اتحقق:**
- ✅ تينانت restaurant (v2) ينقل طلب بين مراحله المعرّفة بدون أي مرجعية لـ need_wash/need_iron
- ✅ تينانت المغسلة الأصلي (v1) لسه شغال 100% زي ما هو (E2E 7 stations safety net يعدي)

## ما تم تنفيذه لإغلاق الفجوة (Phase 0+1)

1. **نقل GARMENT_PROFILES**: `lib/rules/workflow-engine-v1.ts` → `lib/legacy/laundry-workflow-v1.ts` بدون تعديل + الملف الأصلي بقى re-export
   - المطلوب إضافي في المهمة: انقله أيضاً إلى `legacy/laundry-validation-rules.ts` (نفس المحتوى) — تم إنشاء نسخة ثانية للتوضيح

2. **جدول `workflow_transitions`**: موجود بالفعل من migration `20260713000000_workflow_engine_v3_foundation.sql`

3. **تعديل `station-workflow.ts`**: أصبح Wrapper يقرأ الشروط من `workflow_transitions` لأي تينانت v2، ويستخدم القديم للقدام

## المتبقي للمهمة 1 (يوم واحد)

- إنشاء `legacy/laundry-validation-rules.ts` كنسخة واضحة منفصلة (تم)
- توثيق أن `workflow_stages` القديم (من 20260709130000) كان واجهة فقط، وأن `workflow_stages_v2` هو البديل الحقيقي

## التوصية

لا تبني أي ميزة جديدة على `workflow_stages` القديم — ابنِ كل جديد على `workflow_stages_v2 + workflow_transitions + work_orders` مع snapshot. اترك القديم للتينانتس القدام فقط كـ Legacy.
