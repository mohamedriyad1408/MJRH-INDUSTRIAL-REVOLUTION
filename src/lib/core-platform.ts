export type TemplateDepartment = {
  key: string;
  name_ar: string;
  name_en: string;
  enabled: boolean;
  route?: string;
  icon?: string;
  config?: Record<string, unknown>;
};

export type TemplateRole = {
  key: string;
  name_ar: string;
  name_en: string;
  approval_level: number;
  permissions?: Record<string, unknown>;
};

export type TemplateWorkflow = {
  key: string;
  name_ar: string;
  name_en: string;
  style: string;
  definition: Record<string, unknown>;
};

export type TemplateFinancialEvent = {
  key: string;
  name_ar: string;
  name_en: string;
  accounting_rule?: Record<string, unknown>;
  approval_required?: boolean;
};

export type OrganizationTemplateAssets = {
  departments: TemplateDepartment[];
  roles: TemplateRole[];
  workflows: TemplateWorkflow[];
  financialEvents: TemplateFinancialEvent[];
};

export type SetupFormState = {
  templateSlug: string;
  organizationName: string;
  industry: string;
  businessType: string;
  country: string;
  currency: string;
  languages: string[];
  timezone: string;
  branches: Array<{ name: string; city?: string; address?: string }>;
  departments: TemplateDepartment[];
  workingHours: { days: string[]; start: string; end: string };
  tax: { enabled: boolean; taxId?: string; rate?: string; system?: string };
  operationalModel: string;
  workflowStyle: string;
  accounting: { basis: string; fiscalYearStart: string; invoicePrefix: string };
  roles: TemplateRole[];
  workflows: TemplateWorkflow[];
  financialEvents: TemplateFinancialEvent[];
  notifications: { whatsapp: boolean; email: boolean; inApp: boolean };
  numbering: { prefix: string; nextNumber: number };
  approvals: Array<{ key: string; label: string; minAmount?: string; levels: number }>;
  branding: { primaryColor: string; publicUrl?: string; logoUrl?: string };
};

export const CORE_CAPABILITIES = [
  "authentication",
  "organization_engine",
  "branch_engine",
  "department_engine",
  "workflow_engine",
  "actor_engine",
  "task_engine",
  "financial_engine",
  "notification_engine",
  "reporting_engine",
  "permissions_engine",
  "configuration_engine",
] as const;

export const DEFAULT_SETUP_FORM: SetupFormState = {
  templateSlug: "blank_operating_system",
  organizationName: "",
  industry: "",
  businessType: "",
  country: "EG",
  currency: "EGP",
  languages: ["ar", "en"],
  timezone: "Africa/Cairo",
  branches: [{ name: "الفرع الرئيسي", city: "Cairo", address: "" }],
  departments: [],
  workingHours: { days: ["sat", "sun", "mon", "tue", "wed", "thu"], start: "09:00", end: "18:00" },
  tax: { enabled: false, taxId: "", rate: "14", system: "standard" },
  operationalModel: "configuration_driven",
  workflowStyle: "template_defined",
  accounting: { basis: "cash", fiscalYearStart: "01-01", invoicePrefix: "MJRH" },
  roles: [],
  workflows: [],
  financialEvents: [],
  notifications: { whatsapp: true, email: true, inApp: true },
  numbering: { prefix: "DOC", nextNumber: 1 },
  approvals: [{ key: "approval", label: "Generic approval", minAmount: "0", levels: 1 }],
  branding: { primaryColor: "#0f766e", publicUrl: "", logoUrl: "" },
};

export const CORE_SETUP_STEPS = [
  { id: 1, title: "القالب", subtitle: "اختيار Template Registry بدون افتراضات داخل Core" },
  { id: 2, title: "الهوية", subtitle: "اسم المنظمة والصناعة والدولة" },
  { id: 3, title: "الفروع والوقت", subtitle: "الفروع وساعات العمل" },
  { id: 4, title: "الأصول الهيكلية", subtitle: "Departments / Roles / Workflows من القالب" },
  { id: 5, title: "الماليات والضرائب", subtitle: "أحداث مالية عامة وإعدادات ضريبية" },
  { id: 6, title: "الموافقات", subtitle: "مستويات الاعتماد وعلاقات الصلاحيات" },
  { id: 7, title: "الإشعارات والهوية", subtitle: "WhatsApp والبريد والبراند" },
  { id: 8, title: "توليد المنصة", subtitle: "مراجعة وبناء نظام التشغيل" },
];

export function buildCoreSetupPayload(form: SetupFormState) {
  return {
    template_slug: form.templateSlug,
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
    template_assets: {
      departments: form.departments.filter((d) => d.enabled),
      roles: form.roles,
      workflows: form.workflows,
      financial_events: form.financialEvents,
    },
    working_hours: form.workingHours,
    tax: form.tax,
    operational_model: form.operationalModel,
    workflow_style: form.workflowStyle,
    accounting: form.accounting,
    notifications: form.notifications,
    document_numbering: form.numbering,
    approvals: form.approvals,
    branding: form.branding,
  };
}
