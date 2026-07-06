export const WORKFLOW_STATIONS_10 = [
  { id: "cs", label: "خدمة العملاء والدعم", role: "cs_rep", roleLabel: "ممثل خدمة عملاء" },
  { id: "intake", label: "استلام الطلبات والندب", role: "intake_rep", roleLabel: "مسؤول استلام طلبات" },
  { id: "reception", label: "الاستقبال ومطابقة الفواتير", role: "receptionist", roleLabel: "موظف استقبال" },
  { id: "sorting", label: "الفرز والتصنيف وإصدار المارك", role: "sorter", roleLabel: "فني فرز وتصنيف" },
  { id: "cleaning", label: "التنظيف والغسيل والمعالجة", role: "cleaning_tech", roleLabel: "فني غسيل وتنظيف" },
  { id: "drying-assembly", label: "التجفيف والتجميع والفرز", role: "assembly_tech", roleLabel: "فني تجفيف وتجميع" },
  { id: "ironing", label: "الكي بالبخار والمكابس", role: "ironing_tech", roleLabel: "فني كي بالبخار" },
  { id: "packing", label: "التغليف وتجهيز الشحنات", role: "packer", roleLabel: "مسؤول تغليف" },
  { id: "qc", label: "فحص الجودة والمطابقة QC", role: "qc_tech", roleLabel: "مراقب جودة QC" },
  { id: "delivery", label: "التوصيل والندب الخارجي", role: "courier", roleLabel: "مندوب توصيل" },
];

export const MANAGEMENT_ROLES = [
  { id: "owner", label: "المالك والمدير العام (Inhaber & Vorstand)" },
  { id: "ceo", label: "المدير التنفيذي CEO (Vorstand)" },
  { id: "ops_manager", label: "مدير التشغيل العام COO (Betriebsleitung)" },
  { id: "cs_manager", label: "مدير خدمة ورعاية العملاء (Kundenservice)" },
  { id: "sales_manager", label: "مدير المبيعات وتطوير الأعمال (Vertrieb)" },
  { id: "marketing_manager", label: "مدير التسويق والنمو GTM (Marketing)" },
  { id: "logistics_manager", label: "مدير أسطول وحركة النقل (Logistik & Fuhrpark)" },
  { id: "warehouse_manager", label: "مدير المخازن وسلسلة الإمداد (Lager & Lieferkette)" },
  { id: "legal_counsel", label: "مستشار قانوني وشؤون امتثال (Rechtsabteilung)" },
  { id: "hr_manager", label: "مدير الموارد البشرية وشؤون الموظفين (Personalwesen)" },
  { id: "cfo", label: "المدير المالي CFO (Finanzwesen)" },
  { id: "accountant", label: "محاسب ومسؤول خزنة (Buchhaltung)" },
  { id: "supervisor", label: "مشرف وردية عام (Schichtleiter)" },
];

export function getStationLabel(stationId?: string | null): string {
  if (!stationId) return "—";
  const st = WORKFLOW_STATIONS_10.find((x) => x.id === stationId);
  return st ? st.label : stationId;
}

export function getRoleLabel(roleId?: string | null): string {
  if (!roleId) return "—";
  const st = WORKFLOW_STATIONS_10.find((x) => x.role === roleId);
  if (st) return st.roleLabel;
  const mg = MANAGEMENT_ROLES.find((x) => x.id === roleId);
  return mg ? mg.label : roleId;
}
