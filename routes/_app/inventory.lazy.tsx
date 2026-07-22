import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getInventory, InventoryItem } from "@/lib/inventory-api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Boxes, Search, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createLazyFileRoute("/_app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadInventory = async () => {
    if (!tenantId) return;
    setLoading(true);
    const data = await getInventory(tenantId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [tenantId]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter((item) => item.status === "low_stock" || item.status === "out_of_stock").length;

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
      <p className="mt-2 text-muted-foreground font-medium">{t("common.loading")}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir={dir}>
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Boxes className="w-7 h-7 text-teal-600" /> {t("inventory.pageTitle", "إدارة المخزون")}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">{t("inventory.subtitle")}</p>
        </div>
        <div className="text-sm">
          {lowStockCount > 0 && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-2xl border border-red-100 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{lowStockCount} {t("inventory.lowStockItems", "عناصر منخفضة")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder={t("inventory.searchPlaceholder", "بحث بالاسم أو الرمز...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9 rounded-2xl border-slate-200"
        />
      </div>

      <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("common.name")}</th>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("inventory.sku", "الرمز")}</th>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("common.category")}</th>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("inventory.labelQty", "الكمية")}</th>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("inventory.labelReorder", "الحد الأدنى")}</th>
                <th className="px-4 py-4 text-start font-black text-slate-700">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-medium">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-4 text-slate-600 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-4 text-slate-500">{item.category}</td>
                    <td className="px-4 py-4 font-black text-teal-700">
                      {item.quantity} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {item.min_quantity || 0} <span className="text-[10px] opacity-50">{item.unit}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} t={t} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status, t }: { status: InventoryItem["status"]; t: any }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    low_stock: "bg-amber-100 text-amber-800 border-amber-200",
    out_of_stock: "bg-red-100 text-red-800 border-red-200",
    discontinued: "bg-slate-100 text-slate-800 border-slate-200",
  };
  const labels = {
    active: t("inventory.statusActive", "متوفر"),
    low_stock: t("inventory.statusLow", "منخفض"),
    out_of_stock: t("inventory.statusEmpty", "نفد"),
    discontinued: t("inventory.statusRetired", "موقف"),
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
