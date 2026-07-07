export const WORKFLOW_STATIONS_10 = [
  { id: "cs", label: "خدمة العملاء والدعم", role: "cs_rep", roleLabel: "ممثل خدمة عملاء" },
  { id: "intake", label: "استلام الطلبات والندب", role: "intake_rep", roleLabel: "مسؤول استلام طلبات" },
  { id: "reception", label: "الاستقبال ومطابقة الفواتير", role: "receptionist", roleLabel: "موظف استقبال" },
  { id: "sorting", label: "الفرز والتصنيف وإصدار المارك", role: "sorter", roleLabel: "فني فرز وتصنيف" },
  { id: "cleaning", label: "التنظيف والغسيل والمعالجة", role: "cleaning_tech", roleLabel: "فني غسيل وتنظيف" },
  { id: "drying-assembly", label: "التجفيف والتجميع والفرز", role: "assembly_tech", roleLabel: "فني تجفيف وتجميع" },
  { id: "ironing", label: "الكي بالبخار والمكابس", role: "ironing_tech", roleLabel: "فني كي بالبخار" },
  { id: "packing", label: "التغليف وتجهيز الشحنات", role: "packer", roleLabel: "مسؤول تغليف" },
  { id: "qc", label: "فحص الجودة والمطابقة", role: "qc_tech", roleLabel: "مراقب جودة QC" },
  { id: "delivery", label: "التوصيل والندب الخارجي", role: "courier", roleLabel: "مندوب توصيل" },
];

export const MANAGEMENT_ROLES = [
  { id: "owner", label: "المالك والمدير العام" },
  { id: "ops_manager", label: "مدير التشغيل العام" },
  { id: "cs_manager", label: "مدير خدمة العملاء" },
  { id: "supervisor", label: "مشرف وردية عام‍" },
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
