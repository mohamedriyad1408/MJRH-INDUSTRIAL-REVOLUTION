# تأمين التوكنات — إجراء فوري مطلوب (2026-07-12)

## الوضع الحالي (من التدقيق)

**تم العثور على توكنات قديمة مكشوفة في:**

1. **سجل الشات (Arena Agent Mode)** — الرسائل الأولى تحتوي:
   - `ghp_a233**** (تم إخفاؤه - كان يبدأ بهذا)` (GitHub PAT)
   - `sbp_b5fb**** (تم إخفاؤه)` (Supabase PAT)
   - `vcp_3m4p**** (تم إخفاؤه)` (Vercel token)

2. **`.git/config` في `/tmp/testrepo`** — يحتوي Remote URL مع توكن مضمن:
   ```
   url = https://ghp_a233**** (تم إخفاؤه - كان يبدأ بهذا)@github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION.git
   ```
   هذا يخالف القاعدة: لا تخزن توكن في remote URL. يجب أن يكون:
   ```
   url = https://github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION.git
   ```

3. **الـ Workspace الحالي** (`/home/user/project`) — لا يوجد `.git` لأنه مستثنى من الـ snapshot (حسب إعدادات Arena)، فلا يحتوي على توكن، وهذا جيد.

4. **ملفات الريبو** — تم فحص كل الملفات (`grep ghp_|sbp_|vcp_`) — لا يوجد توكن حقيقي مضمن، فقط إشارات `ghp_...` في README و `FINAL_TECHNICAL_REVIEW` كـ placeholder `****`، وهذا مقبول. الـ `repo-guard.mjs` يفشل CI لو وجد توكن حقيقي.

## الإجراء المطلوب فوراً (قبل أي كود جديد) — غير قابل للتفاوض

### 1. Revoke الفعلي (من لوحات التحكم)
- **GitHub:** https://github.com/settings/tokens → احذف التوكن الذي يبدأ بـ `ghp_a233...` → أنشئ توكن جديد Classic أو Fine-grained بصلاحيات `repo` فقط → احفظه في **GitHub Secrets** باسم `GH_PAT` (لا تكتبه في شات)
- **Supabase:** https://supabase.com/dashboard → Project `dngjfjrjddigqadlyain` → Account → Access Tokens → احذف `sbp_b5fb...` → أنشئ جديد → احفظه في **GitHub Secrets** `SUPABASE_ACCESS_TOKEN` و **Vercel Env Vars** `SUPABASE_ACCESS_TOKEN` (Server-side فقط)
- **Vercel:** https://vercel.com/account/tokens → احذف `vcp_3m4p...` → أنشئ جديد → احفظه في **Vercel Env Vars** فقط (لا تضعه في GitHub Secrets إلا لو تحتاج Deploy من CI)

### 2. تنظيف `.git/config`
```bash
git remote set-url origin https://github.com/mohamedriyad1408/MJRH-INDUSTRIAL-REVOLUTION.git
# لا تضع التوكن في URL أبداً — استخدم credential helper أو GITHUB_TOKEN من Actions
cat .git/config  # يجب أن يكون خالياً من ghp_
```

### 3. التأكد من التخزين الصحيح
- **GitHub Secrets:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon, آمنة للـ client), `SUPABASE_ACCESS_TOKEN` (سري، لا تضع SERVICE_ROLE هنا), `E2E_AUTH_EMAIL`, `E2E_AUTH_PASSWORD`
- **Vercel Env Vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Server-side فقط، لا تضعها في GitHub Secrets للـ client)
- **ممنوع تماماً:** وضع أي `SERVICE_ROLE_KEY`, `sbp_`, `ghp_`, `vcp_` في رسالة شات، في README، في `env.example`، أو في أي ملف داخل الريبو

### 4. التحقق الآلي
- `scripts/repo-guard.mjs` يفحص `ghp_`, `sbp_`, `vcp_`, `SERVICE_ROLE`, `DATABASE_URL` في كل push — CI سيفشل لو وجد تسريب
- `lib/rules/error-sanitizer.ts` يفلتر التوكنات من رسائل الخطأ قبل عرضها للمستخدم

## حالة التنفيذ (2026-07-12)

- [x] تم فحص الريبو — لا يوجد توكن حقيقي مضمن (فقط placeholders)
- [x] تم توثيق مكان التسريب القديم في `/tmp/testrepo/.git/config`
- [ ] **مطلوب من المالك:** عمل Revoke فعلي للتوكنات الثلاثة القديمة وإنشاء جديدة (لا يمكن للـ Agent عمل Revoke API بدون صلاحية لوحة التحكم)
- [ ] تنظيف `/tmp/testrepo` (تم حذفه تلقائياً بعد كل session، لكن في جهازك المحلي يجب `git remote set-url origin https://...`)

## ملاحظة للفريق

الخطة v3.1 و v3.2 التزمت بصفر تكلفة إضافية إلا Mews Sandbox و Supabase OAuth (مجانيين). أي خدمة مدفوعة (Opera On-Premise, SAML حقيقي, WhatsApp Business API الرسمي) مؤجلة في قسم Pro ولا تُلمس.

تم تنظيف التوكنات من الشات الجديد — هذا الملف لا يحتوي على أي توكن حقيقي، فقط تعليمات.
