export type SetupFormState = {
  organizationName: string;
  industry: string;
  businessType: string;
  country: string;
  currency: string;
  languages: string[];
  timezone: string;
  branches: Array<{ name: string; city?: string; address?: string }>;
  departments: Array<{ key: string; name_ar: string; name_en: string; enabled: boolean }>;
  workingHours: { days: string[]; start: string; end: string };
  tax: { enabled: boolean; taxId?: string; rate?: string; system?: string };
  operationalModel: string;
  workflowStyle: string;
  accounting: { basis: string; fiscalYearStart: string; invoicePrefix: string };
  roles: Array<{ key: string; name_ar: string; name_en: string; approval_level: number }>;
  notifications: { whatsapp: boolean; email: boolean; inApp: boolean };
  numbering: { prefix: string; nextNumber: number };
  approvals: Array<{ key: string; label: string; minAmount?: string; levels: number }>;
  branding: { primaryColor: string; publicUrl?: string; logoUrl?: string };
};

export const DEFAULT_CORE_DEPARTMENTS = [
  { key: "customer_service", name_ar: "خدمة العملاء", name_en: "Customer Service", enabled: true },
  { key: "operations", name_ar: "التشغيل", name_en: "Operations", enabled: true },
  { key: "accounting", name_ar: "الحسابات", name_en: "Accounting", enabled: true },
  { key: "sales", name_ar: "المبيعات", name_en: "Sales", enabled: true },
  { key: "marketing", name_ar: "التسويق", name_en: "Marketing", enabled: true },
  { key: "hr", name_ar: "الموارد البشرية", name_en: "HR", enabled: true },
  { key: "legal", name_ar: "الشؤون القانونية", name_en: "Legal", enabled: true },
  { key: "administration", name_ar: "الإدارة", name_en: "Administration", enabled: true },
  { key: "owner_dashboard", name_ar: "لوحة المالك", name_en: "Owner Dashboard", enabled: true },
];

export const DEFAULT_CORE_ROLES = [
  { key: "owner", name_ar: "المالك", name_en: "Owner", approval_level: 99 },
  { key: "department_manager", name_ar: "مدير قسم", name_en: "Department Manager", approval_level: 50 },
  { key: "supervisor", name_ar: "مشرف", name_en: "Supervisor", approval_level: 20 },
  { key: "actor", name_ar: "منفذ عمل", name_en: "Actor", approval_level: 5 },
  { key: "viewer", name_ar: "مشاهد", name_en: "Viewer", approval_level: 0 },
];

export const DEFAULT_SETUP_FORM: SetupFormState = {
  organizationName: "",
  industry: "",
  businessType: "",
  country: "EG",
  currency: "EGP",
  languages: ["ar", "en"],
  timezone: "Africa/Cairo",
  branches: [{ name: "الفرع الرئيسي", city: "Cairo", address: "" }],
  departments: DEFAULT_CORE_DEPARTMENTS,
  workingHours: { days: ["sat", "sun", "mon", "tue", "wed", "thu"], start: "09:00", end: "18:00" },
  tax: { enabled: false, taxId: "", rate: "14", system: "standard" },
  operationalModel: "single_branch_workflow",
  workflowStyle: "department_task_flow",
  accounting: { basis: "cash", fiscalYearStart: "01-01", invoicePrefix: "MJRH" },
  roles: DEFAULT_CORE_ROLES,
  notifications: { whatsapp: true, email: true, inApp: true },
  numbering: { prefix: "DOC", nextNumber: 1 },
  approvals: [{ key: "financial_event", label: "اعتماد الأحداث المالية", minAmount: "0", levels: 1 }],
  branding: { primaryColor: "#0f766e", publicUrl: "", logoUrl: "" },
};

export const CORE_SETUP_STEPS = [
  { id: 1, title: "الهوية", subtitle: "اسم المنظمة والصناعة والدولة" },
  { id: 2, title: "الفروع والوقت", subtitle: "الفروع وساعات العمل" },
  { id: 3, title: "الأقسام", subtitle: "الأقسام الافتراضية والقابلة للتوسعة" },
  { id: 4, title: "النموذج التشغيلي", subtitle: "طريقة تدفق العمل بدون منطق صناعة" },
  { id: 5, title: "الماليات والضرائب", subtitle: "العملة والضريبة والترقيم" },
  { id: 6, title: "الأدوار والموافقات", subtitle: "الصلاحيات ومستويات الاعتماد" },
  { id: 7, title: "الإشعارات والهوية", subtitle: "WhatsApp والبريد والبراند" },
  { id: 8, title: "توليد المنصة", subtitle: "مراجعة وبناء نظام التشغيل" },
];

export function buildCoreSetupPayload(form: SetupFormState) {
  return {
    organization: {
      name: form.organizationName,
      industry: form.industry,
      business_type: form.businessType,
      country: form.country,
      currency: form.currency,
      languages: form.languages,
      timezone: form.timezone,
    },
    branches: form.branches.filter((b) => b.name.trim()),
    departments: form.departments.filter((d) => d.enabled),
    working_hours: form.workingHours,
    tax: form.tax,
    operational_model: form.operationalModel,
    workflow_style: form.workflowStyle,
    accounting: form.accounting,
    roles: form.roles,
    notifications: form.notifications,
    document_numbering: form.numbering,
    approvals: form.approvals,
    branding: form.branding,
  };
}
