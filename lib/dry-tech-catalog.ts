import { supabase } from "@/integrations/supabase/client";

export type DryTechItem = {
  name: string;
  service_type: "both" | "ironing" | "cleaning";
  unit_price: number;
  category: "رجالي" | "حريمي" | "أطفال" | "تنظيف المفروشات" | "سجاد وموكيت" | "توصيل وخدمات";
};

// Default tabs for UI components that haven't transitioned to dynamic loading yet
export const POS_CATEGORY_TABS = [
  { id: "all", label: "كافة الأصناف", icon: "" },
  { id: "رجالي", label: "رجالي", icon: "" },
  { id: "حريمي", label: "حريمي", icon: "" },
  { id: "أطفال", label: "أطفال", icon: "" },
  { id: "تنظيف المفروشات", label: "مفروشات", icon: "" },
  { id: "سجاد وموكيت", label: "سجاد", icon: "" },
  { id: "توصيل وخدمات", label: "توصيل وخدمات", icon: "" },
];

export const DRY_TECH_CATALOG_SEED_LENGTH = 173;

export async function getCatalogData() {
  const data = await import("../src/data/catalog.json");
  return data.default;
}

export async function seedDryTechCatalog(tenantId: string) {
  const { data: existing } = await supabase.from("service_items").select("id").eq("tenant_id", tenantId).limit(1);
  if (existing && existing.length > 0) return { inserted: 0, reason: "catalog_exists" };

  const { DRY_TECH_CATALOG_SEED } = await getCatalogData();

  const rows = (DRY_TECH_CATALOG_SEED as DryTechItem[]).map((item) => ({
    tenant_id: tenantId,
    name: item.name,
    service_type: item.service_type as any,
    unit_price: item.unit_price,
    category: item.category,
    is_active: true,
  }));
  const { error } = await supabase.from("service_items").insert(rows);
  if (error) throw error;
  return { inserted: rows.length, reason: "ok" };
}
export const ensureDryTechCatalogSeeded = seedDryTechCatalog;
