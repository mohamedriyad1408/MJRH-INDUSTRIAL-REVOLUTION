import type { OrganizationTemplateAssets } from "@/lib/core-platform";

export type OrganizationTemplate = {
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  category: "foundation" | "industry_package" | "customer_private";
  status: "active" | "placeholder" | "archived";
  assets: OrganizationTemplateAssets;
};

const GENERIC_FINANCIAL_EVENTS = [
  { key: "transaction", name_ar: "معاملة", name_en: "Transaction", accounting_rule: {}, approval_required: false },
  { key: "adjustment", name_ar: "تسوية", name_en: "Adjustment", accounting_rule: {}, approval_required: true },
  { key: "allocation", name_ar: "تخصيص", name_en: "Allocation", accounting_rule: {}, approval_required: false },
  { key: "settlement", name_ar: "إقفال/تسوية نهائية", name_en: "Settlement", accounting_rule: {}, approval_required: true },
  { key: "approval", name_ar: "اعتماد", name_en: "Approval", accounting_rule: {}, approval_required: true },
  { key: "transfer", name_ar: "تحويل", name_en: "Transfer", accounting_rule: {}, approval_required: true },
];

export const TEMPLATE_REGISTRY: OrganizationTemplate[] = [
  {
    slug: "blank_operating_system",
    name_ar: "نظام تشغيل فارغ",
    name_en: "Blank Operating System",
    description_ar: "قالب تأسيسي بلا هيكل أعمال مفترض. يضيفه المالك من الصفر.",
    description_en: "Foundation template with no assumed business structure. The owner configures assets from scratch.",
    category: "foundation",
    status: "active",
    assets: {
      departments: [],
      roles: [],
      workflows: [],
      financialEvents: GENERIC_FINANCIAL_EVENTS,
    },
  },
  {
    slug: "generic_operating_organization",
    name_ar: "منظمة تشغيل عامة",
    name_en: "Generic Operating Organization",
    description_ar: "قالب عام يثبت Template Registry فقط. يمكن تعديله قبل التوليد.",
    description_en: "A generic organization template that proves the registry path and can be edited before generation.",
    category: "foundation",
    status: "active",
    assets: {
      departments: [
        { key: "workspace", name_ar: "مساحة العمل", name_en: "Workspace", enabled: true, route: "/dashboard", icon: "LayoutDashboard" },
        { key: "execution", name_ar: "التنفيذ", name_en: "Execution", enabled: true, route: "/work-orders", icon: "Workflow" },
        { key: "records", name_ar: "السجلات", name_en: "Records", enabled: true, route: "/reports", icon: "BarChart3" },
      ],
      roles: [
        { key: "administrator", name_ar: "مسؤول", name_en: "Administrator", approval_level: 99, permissions: { scope: "organization" } },
        { key: "coordinator", name_ar: "منسق", name_en: "Coordinator", approval_level: 30, permissions: { scope: "department" } },
        { key: "actor", name_ar: "منفذ", name_en: "Actor", approval_level: 5, permissions: { scope: "assigned_tasks" } },
        { key: "observer", name_ar: "مشاهد", name_en: "Observer", approval_level: 0, permissions: { scope: "read_only" } },
      ],
      workflows: [
        {
          key: "generic_task_lifecycle",
          name_ar: "دورة حياة مهمة عامة",
          name_en: "Generic Task Lifecycle",
          style: "template_defined",
          definition: {
            states: ["created", "assigned", "in_progress", "review", "completed"],
            transitions: [
              ["created", "assigned"],
              ["assigned", "in_progress"],
              ["in_progress", "review"],
              ["review", "completed"],
            ],
          },
        },
      ],
      financialEvents: GENERIC_FINANCIAL_EVENTS,
    },
  },
  ...["laundry", "hotel", "hospital", "manufacturing", "construction", "logistics", "retail"].map((slug) => ({
    slug,
    name_ar: slug,
    name_en: slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description_ar: "حزمة صناعة مستقبلية من Marketplace — لا تحتوي أصول مدمجة حالياً.",
    description_en: "Future Marketplace industry package placeholder — no embedded assets yet.",
    category: "industry_package" as const,
    status: "placeholder" as const,
    assets: { departments: [], roles: [], workflows: [], financialEvents: GENERIC_FINANCIAL_EVENTS },
  })),
];

export function getTemplate(slug: string) {
  return TEMPLATE_REGISTRY.find((template) => template.slug === slug) || TEMPLATE_REGISTRY[0];
}
