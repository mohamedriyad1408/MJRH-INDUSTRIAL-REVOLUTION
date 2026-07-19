# خطة تطوير MJRH من "مغسلة بأسماء عامة" إلى منصة مؤسسية قابلة للبيع لفندق 7 نجوم وشركة قابضة

**تاريخ التقييم:** 2026-07-12  
**المستوى الحالي:** Platform v2.6 Hybrid — Enterprise Core موجود في الـ DB لكن محرك سير العمل لا يزال مغسلة صريح  
**الهدف:** إغلاق الفجوة بين ما هو موثق وما هو منفذ فعلياً في الكود

---

## 1) التشخيص الصريح — الفجوة الحقيقية

### ما تقوله المستندات vs ما يقوله الكود

**المستندات تقول:** `service_units` عام، `workflow_stages` قابل للتشكيل، منصة لأي مشروع.

**الكود يقول الحقيقة:**
- `lib/rules/workflow-engine-v1.ts`:
  ```ts
  export const GARMENT_PROFILES = {
    shirt: { need_wash, need_dry, need_iron, need_dry_clean ... target_sla_mins },
    suit_blazer, blanket, carpet ...
  }
  ```
  منطق `need_wash/need_iron` لا معنى له خارج المغاسل. هذا ليس تكوين، هذا Hardcoded Domain Logic.

- `lib/station-workflow.ts`:
  ```ts
  if (to === "ironing") { check cleaning_done }
  if (to === "packing") { check assembly + ironing }
  if (to === "ready") { check qc_passed }
  ```
  7 محطات ثابتة بالأسماء داخل `if` — لو أردت مرحلة "تعقيم غرفة" أو "تحضير طلب مطبخ" لازم تعدل الكود.

- `routes/$tenant/stations/*.tsx`: 7 ملفات منفصلة كل واحد يفترض Garment. لا يوجد `/$tenant/stations/$stage` عام حقيقي إلا كـ Wrapper فوق نفس المنطق القديم.

**الخلاصة:** لدينا **Enterprise DB + Laundry Engine**. يجب فصل المحرك.

### لماذا لا تستطيع بيع هذا لفندق الآن؟
لو رحت لمدير Housekeeping في فندق 7 نجوم وقلت له المنصة بتدعم "مرحلة كي" و "مرتجع غسيل" سيسأل: أين مرحلة "فحص Minibar" و "تعقيم حمام" و "تسليم مفتاح"؟ ستضطر تقول "نعدل الكود" — وهذا يعني المنصة ليست قابلة للتشكيل.

### لماذا لا تستطيع بيعه لقابضة؟
القابضة لا تريد "فروع". تريد **كيانات مختلفة تماماً** بمحاسبة مجمعة وإلغاء معاملات بينية وهرمية موافقات. حالياً عندك `enterprise_branch_summary` يجمع فروع نفس النشاط، لكن لا يوجد `consolidated_income_statement` بجمع شركات مختلفة وإلغاء Inter-company.

---

## 2) المبدأ الهندسي للتصحيح — من Hardcoded إلى Configurable

### ما يجب حذفه/عزله
1. **GARMENT_PROFILES → Generic Entity Profiles**
   - بدل `shirt`, `suit_blazer`, استبدل بـ `entity_type` عام في DB مع JSON schema يحدد الحقول والسير.
   - مثال: `hotel_room` → fields: `room_number, guest_name, checkout_time, minibar_status`, stages: `['inspection', 'cleaning', 'minibar_check', 'qc', 'ready']`

2. **station-workflow.ts → workflow_rules_v2 table**
   - كل قاعدة انتقال (from → to) يجب أن تكون صف في DB وليس `if`:
     ```sql
     workflow_transitions(id, tenant_id, workflow_id, from_stage_id, to_stage_id, condition_json, required_role, auto_escalate_after_mins)
     ```
   - `condition_json` مثل: `{"requires": ["photo_url", "qc_passed"], "payment_status": "paid"}`

3. **7 ملفات stations → Dynamic Stage Renderer واحد**
   - صفحة واحدة `/$tenant/stations/$stageId` تقرأ تعريف المرحلة من DB وتبني الـ UI ديناميكياً (حقول مطلوبة، أزرار، تحقق).

### الهندسة المستهدفة v3

```
enterprises (holding)
 └─ tenants (companies - each can have different industry)
     ├─ workflow_definitions (id, name, industry, is_template)
     │   ├─ workflow_stages_v2 (id, workflow_id, name, slug, order, required_role, sla_target_mins, sla_max_mins, required_fields jsonb, icon, color)
     │   └─ workflow_transitions (from_id, to_id, condition, auto_check)
     ├─ entity_profiles (hotel_room, restaurant_order, cleaning_task...) replaces GARMENT_PROFILES
     │   └─ custom_field_definitions (already exists - extend)
     ├─ branches
     └─ orders → generic work_orders (id, workflow_id, current_stage_id, custom_fields)
```

**Feature Flag:** ابقِ المحرك القديم `v1` يعمل للمغاسل، وابنِ `v2` بجانبه. Tenant يختار `workflow_engine_version = 'v2'` للأنشطة الجديدة.

---

## 3) خطة التطوير — 4 مراحل واقعية (12-16 أسبوع)

لا تحاول بناء كل شيء مرة واحدة. هذا ما يحرقك أمام فندق.

### المرحلة 1: Workflow Builder الحقيقي (الأساس) — 3-4 أسابيع — الأهم على الإطلاق

**الهدف:** مدير غير تقني ينشئ مرحلة جديدة من الواجهة بدون كود.

**Tasks:**
- Migration: `workflow_definitions`, `workflow_stages_v2`, `workflow_transitions`, `workflow_stage_roles`
- Admin UI: `/admin/templates` → يتحول لـ Workflow Builder drag-and-drop (React + dnd-kit, مجاني)
  - إضافة مرحلة: اسم (عربي/إنجليزي) + ترتيب + الدور المسؤول + SLA target/max + حقول مطلوبة (checkboxes من custom_field_definitions) + شروط انتقال
- Refactor `station-workflow.ts` → يستدعي `validateTransition(workflow_id, from, to, order_data)` من DB بدل Hardcoded if
- حافظ على backward compatibility: لو `workflow_engine_version = v1`, استخدم if القديم. لو v2 استخدم DB.
- Tests: إنشاء workflow فندقي وهمي في e2e بدون لمس الكود.

**Definition of Done:** إنشاء tenant جديد نوعه `hospitality`, تعريف workflow من 5 مراحل مختلفة تماماً عن المغسلة من UI فقط، وتشغيل 10 طلبات عليه بدون أي `if (station === 'ironing')` في الكود.

**التكلفة:** Zero-cost (Postgres + React). لا يحتاج خدمة مدفوعة.

---

### المرحلة 2: إثبات أن متعدد الـ Workflow حقيقي — نشاط ثاني كامل — 2-3 أسابيع

**القاعدة الذهبية:** لا تقل "نستطيع" — أرِ دليلاً شغالاً.

**اختر نشاطاً واحداً فقط:**
- **أ. Housekeeping فندق** (أفضل لإثبات 7 نجوم) أو
- **ب. نظافة مكاتب B2B** (أسهل تقنياً)

**لنأخذ Housekeeping:**

- Entity: `hotel_room` → fields: `room_number, floor, guest_status (vacant/occupied), cleaning_type (daily/checkout), minibar_used, maintenance_issue`
- Workflow: `inspection → cleaning → minibar_check → maintenance_check → qc → ready`
- Stages UI: كل مرحلة تطلب حقول مختلفة + صورة قبل/بعد (اللي نفذناها بالفعل)
- Room Management: ربط `branch_id` = فندق، `custom_fields.room_number` — لا تحتاج PMS بعد في هذه المرحلة، إدخال يدوي كافٍ للإثبات.
- White-label proof: `/ $tenant/branding` → يسمح برفع شعار الفندق وألوانه، بوابة الضيف تظهر شعار الفندق مش MJRH.

**Definition of Done:** Demo مباشر لفندق: "هذا tenant مغسلة شغال بـ 7 محطات غسيل، وهذا tenant housekeeping شغال بـ 6 محطات فندقية مختلفة تماماً، نفس الكود، لا يوجد if مغسلة".

**هذا يسمح لك تقول للفندق:** "مش بنعدل كود، بنضيف workflow".

---

### المرحلة 3: جاهزية فندق 7 نجوم (الحد الأدنى القابل للبيع) — 4-5 أسابيع

الآن بعد أن أثبتت Workflow Builder + نشاطين، يمكنك إضافة الحد الأدنى للفندق:

**3.1 تكامل PMS (الحد الأدنى) — يحتاج تكلفة/تعاون**
- لا تبدأ بـ Opera باهظ. ابدأ بـ **Mews** (لديه API مجاني للتجربة) أو **Protel** Cloud Demo.
- Architecture: `pms_adapters` table + Edge Function `pms-bridge` (Supabase Edge, مجاني ضمن الباقة)
  - `POST /pms/webhook/checkin` → ينشئ housekeeping task تلقائياً
  - `folio_posting`: عند انتهاء خدمة غسيل للضيف → `POST /pms/folio` يضيف المبلغ لفاتورة الغرفة (folio)
  - Zero-cost للـ prototype: Mock Adapter يقرأ CSV حجز أو Google Sheet، والإنتاج الحقيقي يحتاج اتفاق مع الفندق.
- **مؤجل لـ Pro إذا طلبوا Opera On-Premise**: يحتاج VPN + شهادة PCI — ضعه في قسم مؤجل.

**3.2 تجربة ضيف White-label حقيقية**
- ` tenants.branding_config jsonb`: `{ logo_url, primary_color, tenant_name, hide_mjrh_branding: true }`
- بوابة الضيف `/guest/[token]` تستخدم Branding Config، لا تظهر MJRH إطلاقاً.
- مثال: `hotel-bristol.mjrh.app/guest/abc` يظهر "Bristol Housekeeping" وشعار الفندق.

**3.3 SLA حقيقي وتصعيد تلقائي**
- حالياً عندك تنبيه داخلي. اجعله SLA Engine:
  - كل `workflow_stages_v2` فيه `sla_target_mins, sla_max_mins, escalation_role, escalation_after_mins`
  - Function `check_sla_breaches()` كل 15 دقيقة (pg_cron مجاني) → لو تجاوز target → إشعار، لو تجاوز max → يصعد تلقائياً للدور الأعلى + يضيف لون أحمر + يحسب غرامة SLA
  - Dashboard للفندق: نسبة الالتزام SLA لكل نوع غرفة.

**3.4 أمان مؤسسي — الحد الأدنى**
- SSO/SAML: استخدم Supabase Auth يدعم SAML (في باقة Pro من Supabase، لكن يمكنك عمل Mock SSO عبر OAuth2 general مجاني كإثبات، والـ SAML الحقيقي مؤجل لـ Pro)
- Audit Logs: جدول موجود `operation_events` لكن يحتاج `immutable` + توقيع + تصدير PDF للمدقق الخارجي
- PCI DSS: لا تلمس كارت الضيف مباشرة. قل للفندق: "نحن نكتب على folio، الدفع يبقى في PMS". هذا يتجنب PCI تماماً في المرحلة الأولى.

**Definition of Done لـ فندق 7 نجوم:** Demo مع Mews Sandbox + White-label Guest Portal + SLA Dashboard + حجز يتحول لطلب Housekeeping تلقائياً.

---

### المرحلة 4: جاهزية شركة قابضة (الأصعب) — 4-6 أسابيع بعد المرحلة 3

**لا تبدأ هذه قبل أن تنجح في فندق واحد.**

**4.1 تجميع مالي متعدد الكيانات الحقيقي**
- حالياً: `enterprise_branch_summary` يجمع فروع نفس الشركة.
- المطلوب: `consolidated_financials` يجمع شركات مختلفة مع Inter-company eliminations.
  - Table `intercompany_transactions`: `from_tenant_id, to_tenant_id, amount, type, eliminated`
  - View `v_consolidated_pnl`: يجمع P&L كل الشركات التابعة ويخصم المعاملات البينية
  - تصدير بصيغة يفهمها Big 4 (Excel مع Mapping لـ IFRS)

**4.2 هرمية موافقات**
- Table `approval_chains`: `tenant_id, entity_type (budget/expense), amount_threshold, required_role, order`
- مثال: مصروف <10k → مدير فرع، 10k-50k → مدير شركة، >50k → CFO Group
- UI `/finance/approvals` + إشعارات + توقيع رقمي.

**4.3 إدارة موردين مركزية**
- Table `vendors` على مستوى Enterprise (ليس Tenant) + `vendor_contracts` + `procurement_orders`
- قابضة تفاوض سعر مسحوق موحد لكل مغاسلها + موردين صيانة موحد.

**4.4 جاهزية اندماج سريع**
- Template `enterprise_onboarding`: عند شراء شركة جديدة، wizard يأخذ CSV عملاء + CSV فروع + يختار workflow template + يطبق في يوم واحد.
- ما تم بناؤه في `/$tenant/onboarding` (5 خطوات) يمتد ليصبح Enterprise Onboarding.

---

## 4) ماذا تقول للفندق الآن وماذا لا تقول

**لا تقل الآن:**
- "نحن منصة لأي مشروع" بدون دليل ثانٍ شغال
- "نتكامل مع Opera" إذا لم يكن عندك Demo يعمل
- "عندنا SSO/SAML" إذا لم تختبره مع IdP حقيقي

**قل الآن (صادق وقابل للإثبات):**
- "لدينا منصة تشغيل مغاسل شغالة مع 500 طلب حقيقي، ونحن الآن نبني Workflow Builder لإضافة Housekeeping كنشاط ثاني كإثبات لقابلية التوسع. هذا هو الـ Roadmap (ورّيه هذا المستند). هل تريد أن تكون الـ Design Partner للفندق الأول؟ نقدم لك 3 أشهر مجاناً مقابل ملاحظات أسبوعية."

هذا يحولك من بائع Software إلى شريك تصميم — الفنادق الكبيرة تحب هذا أكثر من "نشتري منكم".

**للشركة القابضة قل:**
- "نحن متخصصون في التشغيل متعدد الفروع (50+ فرع شغال). الخطوة التالية هي تجميع متعدد الشركات مع إلغاء بيني. هل يمكننا البدء بشركتين تابعتين كـ Pilot لإثبات Consolidated P&L قبل تعميمه على المجموعة؟"

---

## 5) خطة زمنية واقعية وفريق

**الفريق المقترح للـ 12 أسبوع:**
- 1 Lead Backend (Workflow Engine + DB)
- 1 Frontend (Workflow Builder UI + White-label)
- 1 QA/E2E (يضمن أن مغاسل لا تنكسر أثناء بناء v2)
- 0.5 DevOps/Supabase (pg_cron, Edge Functions)

**Timeline:**
- Weeks 1-4: Workflow Builder v2 + Feature Flag
- Weeks 5-7: Housekeeping Proof (2nd industry)
- Weeks 8-12: Hotel MVP (Mews mock + White-label + SLA Engine)
- Weeks 13-18 (اختياري): Holding Consolidated Financials

**Metrics للنجاح:**
- Workflow Builder: إنشاء workflow جديد من UI بدون Deploy في <10 دقائق
- Housekeeping: 50 غرفة/يوم تمر بالـ workflow الجديد بدون كود مغسلة
- Hotel Demo: Check-in في Mews → Housekeeping Task تلقائي في <2 دقيقة
- Holding: Consolidated P&L يجمع شركتين مختلفتين (مغسلة + مطعم) مع إلغاء 1 معاملة بينية

---

## 6) الخلاصة التنفيذية — ما الذي يمنعك من البيع اليوم وما الذي سيفتح الباب

**ما يمنعك اليوم:** الكود يقول مغسلة، المستندات تقول منصة — الفجوة تظهر في أول Demo تقني عميق.

**ما يفتح الباب:** 
1. Workflow Builder يعمل + 
2. نشاط ثانٍ شغال فعلياً (ليس نظرياً) + 
3. Demo Mews + White-label + SLA حقيقي.

عندها يمكنك الذهاب لفندق بقصة: "شغالين بنشاطين مختلفين فعلياً، نفس الكود، وهذا Demo مع نظام حجز حقيقي. تريد أن تكون ثالث نشاط؟"

**الاستثمار الأهم الآن ليس مزايا جديدة، بل إزالة Hardcoded Laundry Logic من محرك سير العمل.**

---

## ملحق: قائمة الملفات التي تحتوي Hardcoded Laundry يجب عزلها في Phase 1

- `lib/rules/workflow-engine-v1.ts` → يجب أن يصبح `legacy/laundry-workflow-v1.ts` ويُستبدل بـ `workflow-engine-v2.ts` الذي يقرأ من DB
- `lib/station-workflow.ts` → يجب أن يصبح Wrapper يختار بين v1 و v2 حسب `tenant.workflow_engine_version`
- `routes/$tenant/stations/*.tsx` (7 ملفات) → استبدل بـ `/$tenant/stations/$stageId` واحد ديناميكي
- Tests `station-workflow-core.test.ts` → يجب أن يختبر قواعد عامة، ليس قواعد غسيل

عند إزالة هذه الـ 4 نقاط، يمكنك القول بثقة أن المنصة لم تعد "مغسلة معاد تسميتها".

