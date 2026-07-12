# سيناريو اختبار الساعة — تينانت كامل من الواجهة فقط بدون تدخل مطور (معيار قبول نهائي لـ v3.1)

**الهدف:** حد غير تقني (مش مطور) يقعد قدام الشاشة لوحده، ويبني نشاط جديد بالكامل (سير عمل + نماذج + تقرير) خلال أقل من ساعة، بدون ما يسأل سؤال واحد.

**المبدأ:** أي ادعاء "تم" لازم دليل حي (Screenshot, CI Success Link, Query Result)، مش وصف.

---

## المتطلبات المسبقة (قبل بدء الساعة)

- تينانت جديد فارغ: `workflow_engine_version = 'v2'`
- مستخدم بصلاحية `owner`
- متصفح كروم + اتصال إنترنت (لا حاجة لـ Node.js أو VS Code)

## الخطوات التفصيلية (60 دقيقة)

### 0-5 دقائق: إنشاء التينانت + اختيار الصناعة

1. اذهب إلى `/signup` → أنشئ تينانت جديد: اسم "مغسلة الاختبار + فندق"، نوع Business = `cleaning` (أو `hotel`), عملة EGP
2. من Admin، تأكد أن `tenants.workflow_engine_version = 'v2'` (Feature Flag افتراضي v1 للقدام، v2 للجديد)
3. افتح `/admin/workflow-builder`

### 5-20 دقيقة: Workflow Builder — سير عمل جديد من الصفر (بدون كود)

1. اضغط "قالب جديد" → اسم عربي "تنظيف مكاتب B2B" + EN "Office Cleaning B2B" + Industry `cleaning` + Is Template ✅
2. أضف 5 مراحل عبر زر "إضافة مرحلة" + Drag-and-Drop لإعادة الترتيب:
   - Stage 1: `استلام` (intake) — slug `intake`, required_role `cs_manager`, SLA target 60, max 120, icon 📥, color #0d9488, is_initial ✅
   - Stage 2: `فحص` (inspection) — slug `inspection`, role `ops_manager`, SLA 30/60, icon 🔍, #3b82f6
   - Stage 3: `تنظيف` (cleaning) — slug `cleaning`, role `employee`, SLA 120/240, icon 🧹, #8b5cf6
   - Stage 4: `جودة` (qc) — slug `qc`, role `ops_manager`, SLA 30/60, required_fields `["photo_url"]`, icon ✅, #f59e0b
   - Stage 5: `تسليم` (delivery) — slug `delivery`, role `courier`, SLA 60/120, is_final ✅, is_financial_trigger ✅ (مهم للمحاسبة), icon 🚚, #10b981
3. اضغط "حفظ Workflow" → يتحقق من Whitelist (لا JS eval) → يحفظ في `workflow_definitions + workflow_stages_v2 + workflow_transitions` مع `ON CONFLICT DO NOTHING`
4. **دليل حي:** Screenshot يظهر المراحل الخمسة مرتبة + Badge `Done Phase 1`

**تحقق أمان إلزامي:** جرب إدخال `validation_rules` فيها `=>` أو `eval(` — يجب أن يرفضها DB Trigger `validate_transition_condition` برسالة `Invalid condition key` أو `forbidden pattern`

### 20-35 دقيقة: Input Builder — حقول مخصصة بدون كود

1. اذهب إلى `/admin/input-builder` + `/$tenant/settings/workflow/$stageId/fields` (per stage)
2. أضف حقول:
   - لمرحلة `inspection`: `tire_condition` select خيارات `جيدة,متوسطة,تالفة` + `photo` نوع `photo` input_method `scan` (html5-qrcode)
   - لمرحلة `cleaning`: `room_number` text + `floor` number + `guest_status` select `vacant,occupied,checkout`
   - لمرحلة `qc`: `intake_photo_url` photo + `delivery_photo_url` photo (نظام Before/After الموجود)
3. جرب Preview حي — يظهر مثل Google Forms
4. جرب رفع صورة >500KB — يجب أن يرفضها Trigger `check_field_value_size` برسالة `Field value too large ... free storage protection`
5. **دليل حي DoD:** مدير فندق يضيف حقل "حالة الميني بار" select (فاضي/نص/كامل) لمرحلة `minibar_check` من الواجهة فقط، يظهر فوراً في نموذج المرحلة، وتُحفظ قيمته في `field_values`

### 35-50 دقيقة: Output Builder — تقارير بدون كود

1. اذهب إلى `/admin/report-builder` + `/$tenant/reports/builder`
2. ابنِ تقرير: 
   - اسم عربي "عدد الغرف المتأخرة عن SLA هذا الأسبوع مجمعة حسب الطابق"
   - مصدر `work_orders`
   - أعمدة `id,title,custom_fields.room_number,custom_fields.floor,current_stage_id,sla_breached`
   - فلاتر `[{"field":"sla_breached","operator":"eq","value":true},{"field":"created_at","operator":"gte","value":"now-7d"}]` — operator whitelist `[eq,neq,gt,lt,gte,lte,contains...]` يمنع `; -- drop`
   - Group By `["custom_fields.floor"]`, Sort By floor asc, Chart `bar`
3. اضغط Preview — يبني Query آمن عبر Supabase filter chain (مش string concatenation)
4. Export PDF عبر `jsPDF` + CSV عبر `papaparse` (Excel-compatible، تجنباً لـ SheetJS GHSA-4r6h-8v6p-xvw6)
5. جدولة: كل اثنين 9 صباحاً → `report_schedules` + `pg_cron` + تسليم عبر `whatsapp_queue` الموجود
6. **دليل حي DoD:** التقرير يظهر كـ widget + PDF يُحمل + جدولة تظهر في `report_schedules` مع `next_run_at` = Monday 9am

### 50-60 دقيقة: تشغيل حي + محاسبة + RLS

1. اذهب إلى `/$tenant/work-orders`
2. اختر Workflow "تنظيف مكاتب B2B" → أنشئ طلب: عنوان "تنظيف مكتب 301" + `room_number=301, floor=3, guest_status=vacant`
3. انقل الطلب عبر كل المراحل عبر زر "نقل للمرحلة التالية" — كل انتقال يستدعي `validate_transition_v2` RPC حقيقي من DB، صفر `if (stage==='ironing')`
4. في مرحلة `delivery` (is_financial_trigger=true) + ضع `total_amount=500` + `payment_status=paid` → يجب أن يطلق `sync_work_order_financials` trigger → ينشئ قيد في `journal_entries` (source_type=work_order_payment, work_order_id=...) + `cash_transactions` + `customer_financial_ledger`
5. افتح `/accounting` + `/reports` → تأكد أن P&L لتينانت v2 يطلع أرقام حقيقية مش صفر — View `v_work_orders_pnl` → `total_amount, paid_amount`
6. **اختبار RLS:** سجل دخول بمستخدم تينانت A v2 وحاول قراءة `work_orders` بتاعة تينانت B (fakeTenantId `00000000-0000-0000-0000-000000000000`) — يجب أن يرجع `[]` (RLS يفلتر عبر `can_access_tenant`) — ده أهم اختبار لأنه تسريب بيانات بين تينانتس كان بيحصل قبل كده مع `workflow_stages` القديم
7. **اختبار Snapshot حماية:** عدّل تعريف workflow (أضف مرحلة جديدة) وفيه طلب مفتوح — تأكد إن `workflow_version_snapshot.version` للطلب المفتوح يفضل قديم

**دليل حي مطلوب (مرفق كـ Screenshot/Link):**
- Screenshot CI #XXXXXXX Success يظهر E2E RLS test passed
- Query result: `SELECT * FROM v_work_orders_pnl WHERE tenant_id = '...'` يظهر `total_amount > 0`
- Query result: `SELECT * FROM journal_entries WHERE work_order_id = '...'` يظهر قيد
- Screenshot لـ `workflow_version_snapshot` قبل وبعد تعديل تعريف workflow — يظهر version قديم محفوظ

## بعد انتهاء الساعة — معيار القبول النهائي لـ v3.1 بالكامل

لو حد غير تقني قدر يبني تينانت كامل (workflow + inputs + outputs) لوحده بدون سؤال خلال ساعة — يبقى وصلت للهدف. هذا الفيديو Demo الحي أقوى بكتير من أي مستند مكتوب، وتقدر توريه لمستثمر أو عميل فعلي (فندق/قابضة).

## ملاحظات صفر تكلفة

- كل الأدوات مجانية: `dnd-kit` (Workflow Builder drag-drop), `html5-qrcode` (QR/Barcode), `papaparse` (CSV), `signature_pad` (توقيع), `jsPDF` (PDF), CSV Excel-compatible (تجنباً لـ xlsx high vuln), `pg_cron` (جدولة), `wa.me` + `whatsapp_queue` (Win-back)
- Mews Sandbox + Supabase OAuth مجانيين فعلياً في الباقة الحالية
- مؤجل لـ Pro: Opera On-Premise/VPN/PCI DSS مباشر، SAML حقيقي لـ IdP قديم، WhatsApp Business API الرسمي، تدقيق أمان خارجي رسمي
