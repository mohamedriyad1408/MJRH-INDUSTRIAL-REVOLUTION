# MJRH INDUSTRIAL REVOLUTION (v2.6 Hybrid Governance Architecture)
## دليل المبيعات الميداني وسكريبت ديمو التجمع الخامس (Fifth Settlement Live Sales Order)

**تاريخ الإصدار:** 5 يوليو 2026  
**الهدف الاستراتيجي:** توثيق بيانات الطلب الحقيقي الذي سيتم إدخاله في النظام الحي (`https://mjrh.vercel.app/`) لإتمام صفقات البيع مع أصحاب المغاسل والمستثمرين.  
**قاعدة النطق المعتمدة للعلامة التجارية:** **MJRH = Mjrh = مَجَرَّة (Majarrah / Galaxy)** — يُنطق الاسم في كافة العروض التقديمية والتعليقات الصوتية بالإنجليزية بـ **"Majarrah"** للإشارة إلى الكون التشغيلي المتكامل (Operational Universe).  
**الكود التصميمي الصارم:** التزام كامل بدون أي إيموجيز (Zero Emojis) في الواجهات والشاشات والرسائل تنفيذاً لتوجيهات الإدارة.

---

## 1. بيانات العميل والطلب الحقيقي للتسجيل في النظام (Live Demo Order Data)

يا هندسة، هذا هو الطلب المرجعي القياسي الذي يجب إدخاله في حساب مستأجر `dry-tech` (UUID: `c0ea27c7-138e-4d12-b732-6981bddb4c97`) عند إجراء العروض الترفيهية الحية أمام العملاء:

* **رقم الطلب (Order Number):** `#ORD-2026-995` (أو رقم تسلسلي جديد عند الإنشاء).
* **اسم العميل (Customer Name):** د. شريف الألفي (Dr. Sherif Al-Alfy) — تصنيف العميل: VIP Customer.
* **رقم الهاتف:** `01000000995`
* **العنوان الجغرافي (Fifth Settlement Address):**  
  فيلا 42، منطقة الشويفات، شارع التسعين الجنوبي، التجمع الخامس، القاهرة الجديدة  
  *(Villa 42, Choueifat Zone, South 90th Street, 5th Settlement, New Cairo)*
* **الأصناف المختارة من الكتالوج الموحد (`lib/dry-tech-catalog.ts`):**
  1. **بدلة رجالي قطعتين دراي كلين:** الفئة (`رجالي`) — نوع الخدمة (`both` غسيل وكي) — السعر: **250.00 ج.م**.
  2. **فستان زفاف حريمي:** الفئة (`حريمي`) — نوع الخدمة (`both` عناية فائقة) — السعر: **600.00 ج.م**.
  3. **سجاد وموكيت شنواه (4×3):** الفئة (`سجاد وموكيت`) — نوع الخدمة (`both` غسيل آلي) — السعر: **350.00 ج.م**.
* **إجمالي الفاتورة المبدئي (Receivable Value):** **1,200.00 ج.م**.
* **خيار التوصيل المستعجل (Expedite Priority):** تحديد توصيل خلال 4 ساعات (`is_urgent = true`).
* **طريقة التحصيل (Payment Method):** تحويل إلكتروني عبر **InstaPay** (المبلغ المحول فعلياً في الإيصال: **1,250.00 ج.م**، ليقوم النظام آلياً بفصل **50.00 ج.م** كتِبس للمندوب محمود سعيد).

---

## 2. نصوص التعليق الصوتي الإنجليزي المعتمدة (مع تحسين نطق مچرة = Majarrah)

تم توليد 7 مقاطع صوتية حقيقية (.mp3) ومدمجة في مشغل الفيديو التفاعلي، حيث تم ضبط النطق الصوتي للعلامة التجارية ليكون **"Majarrah"** (مچرة / Galaxy):

### 🎙️ Scene 1: Order Intake & POS Customization (استقبال الطلب في التجمع الخامس)
> *"Welcome to Majarrah Industrial Revolution, our Version 2.6 Hybrid Governance operating platform. Majarrah means Galaxy, representing our all-encompassing operational universe. Today, we process a real commercial sales order for Doctor Sherif Al-Alfy, a VIP client located in Fifth Settlement, New Cairo. From our touch-optimized Point of Sale interface, we select from seven clean garment categories without clutter. We input a men's two-piece suit, a bridal gown, and a Chinese silk carpet, totaling one thousand two hundred Egyptian pounds. Using the advanced intake invoice editor, we document a light oil stain on the bridal gown with photograph attachments, set a four-hour expedited priority, and instantly post an automated sales receivable accrual."*

### 🎙️ Scene 2: 1-Click Fast Track Sorting (الفرز السريع باللمس دون باركود)
> *"As Doctor Sherif's Fifth Settlement order arrives at the sorting workstation, our touch hyper-automation operates seamlessly without barcode scanning dependency. The sorting supervisor reviews the invoice and executes a single-click fast track sort using the fast track sort all command. The system immediately routes the suit to dry cleaning, the carpet to specialized floor processing, and the bridal gown to delicate stain quarantine. Every garment is precisely timestamped, and the accounting engine calculates an estimated direct cost of goods sold allocation without immediate cash register withdrawal."*

### 🎙️ Scene 3: Bulk Cleaning & Stain Quarantine (الغسيل الجماعي وعزل البقع)
> *"At the cleaning and chemical processing workstation, operators approve normal bulk laundry loads with a single click. When inspecting the bridal gown, the technician activates the piece quarantine protocol to isolate the oil stain for specialized solvent remediation. This ensures the remainder of Doctor Sherif's order progresses without delay. Once the stain is successfully treated, a single click restores the gown to the production line. Concurrently, the financial engine automatically records chemical inventory consumption, generating a double-entry ledger debit to operating expenses and credit to raw material inventory."*

### 🎙️ Scene 4: Fairness Ironing & Single-Actor Rule (الكي العادل ومبدأ وحدة الطلب)
> *"The pressing and ironing workstation is the operational core of Majarrah. Our exclusive allocation algorithm enforces five strict architectural rules. First, the single-actor order ownership rule assigns Doctor Sherif's entire order to one senior technician to guarantee uniform finishing quality. Second, workload is balanced by actual shift check-in times. Third, shirt and delicate garment fatigue is actively moderated. Fourth, technicians are protected from burnout through jumbo order saturation locks when open work exceeds forty pieces. Finally, upon pressing completion, the system automatically logs piece-rate labor productivity and posts an accrued payroll liability entry."*

### 🎙️ Scene 5: Quality Assurance & WhatsApp Ready Notice (تأكيد الجودة وإشعار WhatsApp)
> *"At the quality assurance and packing workstation, the inspection supervisor verifies all label codes for the suit, bridal gown, and silk carpet. With one touch on the fast track pack and ready command, the order status transitions to ready for delivery. Instantly, our automated notification engine prepares and sends an itemized WhatsApp billing statement directly to Doctor Sherif's mobile phone without incurring external paid programming interface costs. Concurrently, packaging supply consumption is logged, finalizing the actual cost of goods sold for the order."*

### 🎙️ Scene 6: Fifth Settlement GPS Map & InstaPay Tip (خريطة التجمع الخامس وفصل التبس)
> *"Our live geographical dispatch map manages courier routing across New Cairo. The algorithmic dispatch engine assigns the ready shipment to courier Mahmoud Said, mapping the fastest route through South Ninetieth Street to Doctor Sherif's villa in the Choueifat zone of Fifth Settlement. Upon handover, the courier confirms delivery and uploads the InstaPay bank transfer receipt. Doctor Sherif transferred one thousand two hundred and fifty Egyptian pounds for the one thousand two hundred pound invoice. The platform automatically separates the fifty pound excess into a driver tip liability account, preventing revenue distortion and auditing the electronic receipt."*

### 🎙️ Scene 7: C-Suite Financial Headquarters & Ledger (الإدارة العليا والقيود المزدوجة)
> *"This completes the operational journey inside Majarrah, our galactic operating system for commercial laundry. Across all workstations, automated double-entry bookkeeping has reconciled customer receivables, chemical usage, direct labor payroll, and electronic InstaPay clearing with zero variance. In our C-Suite corporate headquarters, founders and investors monitor live profitability under Version 2.6 Hybrid Governance. This Fifth Settlement order generated an eighty-eight percent gross margin, validating our four point four six million Egyptian pound software valuation and demonstrating why Majarrah is the ultimate strategic engine for industrial scaling."*

---

## 3. جدول القيود المحاسبية المزدوجة لطلب التجمع الخامس (Double-Entry Ledger)

| المرحلة التشغيلية (APDO Process) | الحساب المدين (Debit Account - EGP) | الحساب الداين (Credit Account - EGP) | المبلغ (ج.م) | الأثر الخزيني النقدي (Cash Safe Impact) |
| :--- | :--- | :--- | :---: | :--- |
| **1. إنشاء الطلب واعتماد الفاتورة** | العملاء / ذمم مدينة (Accounts Receivable) | إيرادات خدمات الغسيل والكي (Service Revenue) | **1,200.00** | `cash_impact: false` (استحقاق آجل حتى التسليم) |
| **2. فرز وتدقيق الفاتورة** | تشغيل تحت التشغيل (WIP Inventory Allocation) | احتياطي تكلفة المبيعات التقديرية (Estimated COGS Reserve) | **144.00** | `cash_impact: false` (تقدير تكلفة أولية) |
| **3. غسيل ومعالجة كيميائية (بقعة الفستان)** | مصروفات تشغيل ومواد غسيل (Chemical Expenses) | مخزون الخامات والمذيبات (Raw Material Inventory) | **65.00** | `cash_impact: false` (`journal_required: true` استنفاد مخزون) |
| **4. كي الطلب (أحمد محمود - أجر إنتاجية)** | أجور وتشغيل مباشر / كي (Direct Labor Expense) | أجور ورواتب مستحقة الدفع (Accrued Payroll Liability) | **110.00** | `cash_impact: false` (استحقاق حتى موعد صرف الرواتب) |
| **5. تغليف واعتماد الجودة** | مصروفات تشغيل / مواد تغليف (Packaging Expense) | مخزون مواد التغليف والعلب (Packaging Inventory) | **35.00** | `cash_impact: false` (تثبيت التكلفة الفعلية COGS = 210 ج.م) |
| **6. التوصيل وتحصيل InstaPay بالزيادة** | البنك / وسيط تحويلات InstaPay (Bank Clearing) | العملاء (1,200) + أمانات تِبس مناديب مستحقة (50) | **1,250.00** | `cash_impact: true` (تحصيل إلكتروني مؤكد وفصل التبس آلياً) |
| **7. إقفال الوردية والتطابق المالي** | إجمالي التكلفة المباشرة COGS = **210.00 ج.م** | مجمل الربح المحقق = **990.00 ج.م** (82.5% Margin) | **1,200.00** | **تطابق تام (Zero Variance Reconciled)** |

---

## 4. تعليمات خطوة بخطوة لمندوب المبيعات على المنصة الحية

عند الجلوس مع العميل أو المستثمر، افتح الرابط الحي `https://mjrh.vercel.app/` ونفذ الخطوات التالية بدقة:
1. **شاشة نقطة البيع (`/orders/new`):** ألفت نظر العميل إلى شريط الفئات السبعة النظيف (بدون إيموجيز). اختر العميل "د. شريف الألفي" وأضف البدلة، الفستان، والسجاد.
2. **محرر الفاتورة المتقدم (`intake-invoice-editor.tsx`):** افتح المودال وأضف ملاحظة بقعة الزيت في فستان الزفاف مع التقاط صورة (أو رفع صورة تجريبية)، وحدد زر Expedite 4h.
3. **محطة الفرز (`/stations/sorting`):** اشرح للعميل أننا نعمل باللمس الفائق حالياً (بدون باركود تنفيذاً لقرار الإدارة). اضغط زر `fastTrackSortAll`.
4. **محطة الغسيل (`/stations/cleaning`):** اضغط على زر عزل فستان الزفاف `quarantinePiece` وأرِ العميل كيف يستمر باقي الطلب دون تعطل. ثم اضغط إتمام المعالجة.
5. **محطة الكي (`/stations/ironing`):** استعرض شارات الحضور وأوضح أن الطلب بالكامل ذهب لفني واحد ("مبدأ وحدة الطلب وعدم تجزئته") لحماية الفني من الاحتراق.
6. **محطة التغليف (`/stations/packing`):** اضغط `fastTrackPackAndReady` وأشر إلى إشعار WhatsApp الذي يخرج تلقائياً بدون رسوم API.
7. **الخريطة الحية والتوصيل (`/live-map`):** افتح خريطة التجمع الخامس، وأرِ العميل خط السير من شارع التسعين الجنوبي إلى الشويفات فيلا 42. عند التسليم، ارفع صورة إيصال InstaPay بمبلغ 1,250 ج.م، ودع العميل يرى كيف يكتشف النظام الـ 50 ج.م ويفصلها كتِبس للمندوب دون تلاعب في حسابات المغسلة!
8. **شاشة المحاسبة والإدارة العليا (`/accounting` & `/admin`):** افتح سجل الأستاذ العام واعرض القيود المزدوجة التي تولدت تلقائياً أمام عينيه.

---
*تم اعتماد هذا الدليل بصلاحيات الهندسة الاستراتيجية لشركة MJRH INDUSTRIAL REVOLUTION — مچرة (Galaxy).*
