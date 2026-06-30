import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Search, Loader2, QrCode, Phone, User, FileText, Package } from "lucide-react";

export type SearchMatch = {
  type: "order" | "piece" | "customer" | "invoice";
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  url: string;
};

export function UnifiedSearch() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);

  async function performSearch(q: string) {
    if (!q.trim() || !tenantId) { setResults([]); return; }
    setLoading(true);
    const clean = q.trim();
    const matches: SearchMatch[] = [];

    try {
      // 1. Search Orders (Order ID, Invoice #, Order Number)
      const isNum = !isNaN(Number(clean));
      let oQuery = supabase.from("orders").select("id, order_number, status, total, customers(full_name, phone)").eq("tenant_id", tenantId);
      if (isNum) oQuery = oQuery.eq("order_number", Number(clean));
      else oQuery = oQuery.ilike("id", `%${clean}%`);
      const { data: oRows } = await oQuery.limit(5);

      (oRows ?? []).forEach((o: any) => {
        matches.push({
          type: "order",
          id: o.id,
          title: `طلب #${o.order_number}`,
          subtitle: `${o.customers?.full_name ?? ""} — ${o.customers?.phone ?? ""}`,
          badge: o.status,
          url: `/orders/${o.id}`,
        });
      });

      // 2. Search Customers (Name, Phone)
      const { data: cRows } = await supabase.from("customers").select("id, full_name, phone").eq("tenant_id", tenantId).or(`full_name.ilike.%${clean}%,phone.ilike.%${clean}%`).limit(5);
      (cRows ?? []).forEach((c: any) => {
        matches.push({
          type: "customer",
          id: c.id,
          title: c.full_name,
          subtitle: `هاتف: ${c.phone}`,
          badge: "عميل",
          url: `/customers`,
        });
      });

      // 3. Search Pieces / QR Codes
      const { data: uRows } = await supabase.from("service_units").select("id, order_id, name, current_stage, status").eq("order_id", clean).limit(5).catch(() => ({ data: [] }));
      (uRows ?? []).forEach((u: any) => {
        matches.push({
          type: "piece",
          id: u.id,
          title: `قطعة: ${u.name}`,
          subtitle: `كود: QR-${u.id.substring(0, 6)}`,
          badge: u.current_stage ?? u.status ?? "مفتوح",
          url: `/orders/${u.order_id}`,
        });
      });

      setResults(matches);
    } catch (err) { console.error("Search error:", err); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-60 rounded-xl bg-slate-50 border-slate-200 px-3 text-xs text-muted-foreground shadow-sm flex items-center justify-between hover:bg-slate-100 transition">
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-600" />
            {t("search.placeholder", "بحث موحد (هاتف، QR، طلب)...")}
          </span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 border">CTRL+K</kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 border-0 rounded-3xl overflow-hidden shadow-2xl bg-white" dir={dir}>
        <div className="flex items-center border-b border-slate-100 px-4 py-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-teal-600 shrink-0 me-3" />
          <Input
            placeholder={t("search.modalPrompt", "اكتب رقم هاتف، كود QR، اسم عميل، أو رقم طلب...")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); performSearch(e.target.value); }}
            className="flex-1 border-0 bg-transparent shadow-none text-base font-bold focus-visible:ring-0 px-0"
          />
          {loading && <Loader2 className="w-5 h-5 animate-spin text-teal-600 shrink-0 ms-2" />}
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-2">
          {results.length === 0 && query.trim().length > 0 && !loading && (
            <div className="p-12 text-center text-xs text-muted-foreground font-bold space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{t("search.noResults", "لا توجد نتائج مطابقة لبحثك في قاعدة البيانات.")}</p>
            </div>
          )}
          {results.length === 0 && query.trim().length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground font-semibold space-y-4">
              <div className="flex justify-center gap-6 text-slate-400">
                <div className="flex flex-col items-center gap-1"><QrCode className="w-6 h-6 text-teal-600" /><span>{t("search.qr", "كود QR")}</span></div>
                <div className="flex flex-col items-center gap-1"><Phone className="w-6 h-6 text-blue-600" /><span>{t("search.phone", "هاتف")}</span></div>
                <div className="flex flex-col items-center gap-1"><User className="w-6 h-6 text-indigo-600" /><span>{t("search.name", "اسم")}</span></div>
                <div className="flex flex-col items-center gap-1"><FileText className="w-6 h-6 text-amber-600" /><span>{t("search.order", "طلب")}</span></div>
              </div>
              <p>{t("search.subtext", "يدعم المحرك البحث اللحظي الموحد في سجلات التشغيل والعملاء والفواتير.")}</p>
            </div>
          )}
          {results.map((r, i) => (
            <Link key={i} to={r.url} onClick={() => setOpen(false)} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition group block">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition">
                  {r.type === "order" ? <FileText className="w-5 h-5" /> : r.type === "customer" ? <User className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{r.subtitle}</div>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-slate-200 text-xs font-bold px-2.5 py-1">
                {r.badge}
              </Badge>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
