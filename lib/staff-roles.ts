export const WORKFLOW_STATIONS_10 = [
  { id: "cs", label: "1. خدمة العملاء والدعم (CS Concierge) 🎧", role: "cs_rep", roleLabel: "ممثل خدمة عملاء" },
  { id: "intake", label: "2. استلام الطلبات والندب الداخلي (Order Intake) 📥", role: "intake_rep", roleLabel: "مسؤول استلام طلبات" },
  { id: "reception", label: "3. الاستقبال ومطابقة الفواتير (Reception) 🛎️", role: "receptionist", roleLabel: "موظف استقبال" },
  { id: "sorting", label: "4. الفرز والتصنيف وإصدار المارك (Sorting & Tagging) 🏷️", role: "sorter", roleLabel: "فني فرز وتصنيف" },
  { id: "cleaning", label: "5. التنظيف والغسيل والمعالجة (Cleaning & Washing) 🫧", role: "cleaning_tech", roleLabel: "فني غسيل وتنظيف" },
  { id: "drying-assembly", label: "6. التجفيف والتجميع (Drying & Assembly) 🧺", role: "assembly_tech", roleLabel: "فني تجفيف وتجميع" },
  { id: "ironing", label: "7. الكي بالبخار والمكابس (Ironing & Steaming) 👔", role: "ironing_tech", roleLabel: "فني كي بالبخار" },
  { id: "packing", label: "8. التغليف النهائي والمطابقة (Final Packing) 📦", role: "packer", roleLabel: "مسؤول تغليف" },
  { id: "qc", label: "9. فحص الجودة والمطابقة (Quality Assurance QC) 🛡️", role: "qc_tech", roleLabel: "مراقب جودة QC" },
  { id: "delivery", label: "10. التوصيل والندب الخارجي (External Delivery) 🚚", role: "courier", roleLabel: "مندوب توصيل" },
];

export const MANAGEMENT_ROLES = [
  { id: "owner", label: "المالك والمدير العام 👑" },
  { id: "ops_manager", label: "مدير التشغيل العام ⚙️" },
  { id: "cs_manager", label: "مدير خدمة العملاء 📞" },
  { id: "supervisor", label: "مشرف وردية عام 🧑‍✈️" },
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
