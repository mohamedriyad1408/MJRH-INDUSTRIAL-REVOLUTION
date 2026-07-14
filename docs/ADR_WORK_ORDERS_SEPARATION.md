# ADR 001 — هل work_orders يبقى جدول منفصل عن orders للأبد ولا ندمجهم؟

**تاريخ:** 2026-07-12
**الحالة:** مقبول — Keep Separate Permanently
**القرار:** `work_orders` يفضل جدول منفصل عن `orders` للأبد، وليس دمج مؤقت

## السياق

- `orders` هو جدول legacy مغسلة بعمق: مرتبط بـ `service_units`, `order_items`, `garment logic`, `cleaning_done`, `ironing_completed_at`, `label_status`, `assembly_checked_at` — كلها مفاهيم مغسلة صريحة
- `work_orders` هو جدول عام جديد: `workflow_id`, `current_stage_id`, `workflow_version_snapshot`, `custom_fields`, `sla_due_at` — يدعم أي صناعة
- محاولة الدمج ستتطلب: إضافة nullable columns كثيرة لـ `orders` (workflow_id, snapshot, etc.) + تعديل كل الـ queries القديمة + migration خطير للبيانات الحية (530 طلب في dry-tech وحدها)

## البدائل المدروسة

### A. دمج في جدول واحد عام `work_orders` يحل محل `orders` (Merge)
- **إيجابيات:** جدول واحد، تقارير موحدة بسيطة
- **سلبيات:** خطر كسر عالي جداً — `orders` يستخدم في 20+ صفحة، 10+ triggers مالية، `sync_order_financials`, cash closing, receivables — أي خطأ يوقف مغسلة شغالة
- **تكلفة:** 4-6 أسابيع migration + اختبار شامل + downtime محتمل

### B. إبقاء منفصلين دائماً (Chosen)
- **إيجابيات:** 
  - v1 tenants تفضل على `orders` بدون أي تغيير — شبكة أمان Phase 0
  - v2 tenants تستخدم `work_orders` فقط — نظيف، بدون legacy fields
  - المحاسبة موحدة عبر `journal_entries` بـ `source_type = 'order'|'work_order'` + `work_order_id` nullable
  - يمكن أرشفة `orders` بعد 12+ شهر عندما كل التينانتس تهاجر لـ v2
- **سلبيات:** تقارير P&L تحتاج UNION بين الجدولين (تم حله بـ `v_work_orders_pnl` + `v_consolidated_pnl` يجمع الاثنين)
- **تكلفة:** يوم واحد + لا خطر على الإنتاج

## القرار

**Keep Separate Permanently** — `work_orders` منفصل للأبد.

## التطبيق

- `orders` — legacy، يستخدم `validateOrderMoveLegacy` (if ironing...), `sync_order_financials`, `service_units`
- `work_orders` — generic، يستخدم `validate_transition_v2` (DB-driven), `sync_work_order_financials`, `field_values`, `workflow_version_snapshot`
- `journal_entries` — يحتوي `source_type` و `source_id` و `work_order_id` nullable لربط الاثنين
- `cash_transactions` و `customer_financial_ledger` — نفس الفكرة، `work_order_id` nullable
- Feature Flag `tenants.workflow_engine_version` يحدد أي جدول يستخدمه التينانت
- عند إنشاء تينانت جديد بقالة "restaurant" أو "carwash"، `workflow_engine_version` = 'v2' ويستخدم `work_orders` فقط

## العواقب

- تقارير P&L لـ v2 تطلع أرقام حقيقية من `work_orders` عبر `v_work_orders_pnl` و `sync_work_order_financials`
- دفتر القيود وإقفال الخزنة يعملان للاثنين (تم اختباره: تينانت carwash حي، طلب كامل من البداية للتسليم والدفع، قيد يومية اتولد وظهر في دفتر القيود)
- لا حاجة لـ migration خطير — آمن للإنتاج الشغال

## التزام

هذا القرار نهائي ومؤرخ — أي محاولة دمج مستقبلية تحتاج ADR جديد ومبرر قوي جداً.
