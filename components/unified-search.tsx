import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Search, Loader2, QrCode, Phone, User, FileText, Package, AlertTriangle, X } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      
      if (trigger && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 60);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 60);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const performSearch = useCallback(async (q: string) => {
    setError(null);
    if (!q.trim()) { 
      setResults([]); 
      return; 
    }
    if (!tenantId) {
      setError(t("search.noTenant", "لم يتم تحديد مغسلة — سجّل دخولك أولاً"));
      setResults([]);
      return;
    }
    setLoading(true);
    const clean = q.trim();
    const matches: SearchMatch[] = [];
    
    try {
      const esc = clean.replace(/[%_,\\]/g, "\\$&");
      const jobs: Promise<any>[] = [];

      if (!isNaN(Number(clean))) {
        jobs.push(
          supabase.from("orders")
            .select("id, order_number, status, total, customers(full_name, phone)")
            .eq("tenant_id", tenantId)
            .eq("order_number", Number(clean))
            .limit(5)
            .then((r:any) => ({ key: "order_num", ...r }))
        );
      }

      jobs.push(
        supabase.from("orders")
          .select("id, order_number, status, total, customers(full_name, phone)")
          .eq("tenant_id", tenantId)
          .ilike("id", `${esc}%`)
          .limit(5)
          .then((r:any) => ({ key: "order_id", ...r }))
      );

      jobs.push(
        supabase.from("customers")
          .select("id, full_name, phone")
          .eq("tenant_id", tenantId)
          .ilike("full_name", `%${esc}%`)
          .limit(5)
          .then((r:any) => ({ key: "cust_name", ...r }))
      );

      jobs.push(
        supabase.from("customers")
          .select("id, full_name, phone")
          .eq("tenant_id", tenantId)
          .ilike("phone", `%${esc.replace(/\s+/g, "")}%`)
          .limit(5)
          .then((r:any) => ({ key: "cust_phone", ...r }))
      );

      jobs.push(
        supabase.from("service_units")
          .select("id, order_id, name, current_stage, status, orders!inner(tenant_id, order_number)")
          .eq("orders.tenant_id", tenantId)
          .ilike("id", `${esc}%`)
          .limit(5)
          .then((r:any) => ({ key: "unit_id", ...r }))
      );

      jobs.push(
        supabase.from("service_units")
          .select("id, order_id, name, current_stage, status, orders!inner(tenant_id, order_number)")
          .eq("orders.tenant_id", tenantId)
          .ilike("name", `%${esc}%`)
          .limit(5)
          .then((r:any) => ({ key: "unit_name", ...r }))
      );

      const settled = await Promise.allSettled(jobs);
      const seen = new Set<string>();
      const pushUnique = (m: SearchMatch) => { 
        const k = `${m.type}:${m.id}`; 
        if (!seen.has(k)) { 
          seen.add(k); 
          matches.push(m); 
        } 
      };

      for (const s of settled) {
        if (s.status === "fulfilled" && s.value?.data && !s.value.error) {
          const { key, data } = s.value;
          if (key?.startsWith("order")) {
            (data ?? []).forEach((o: any) => pushUnique({
              type: "order",
              id: o.id,
              title: `طلب #${o.order_number ?? o.id.slice(0,8)}`,
              subtitle: `${o.customers?.full_name ?? t("search.unknownCustomer","عميل غير معروف")} — ${o.customers?.phone ?? ""} — ${Number(o.total ?? 0).toFixed(2)} ج.م`,
              badge: o.status ?? "open",
              url: `/orders/${o.id}`,
            }));
          } else if (key?.startsWith("cust")) {
            (data ?? []).forEach((c: any) => pushUnique({
              type: "customer",
              id: c.id,
              title: c.full_name || c.phone || t("search.unnamed","بدون اسم"),
              subtitle: `هاتف: ${c.phone ?? "—"} • ID: ${c.id.slice(0,8)}`,
              badge: t("search.customerBadge","عميل"),
              url: `/customers?id=${c.id}`,
            }));
          } else if (key?.startsWith("unit")) {
            (data ?? []).forEach((u: any) => pushUnique({
              type: "piece",
              id: u.id,
              title: `قطعة: ${u.name ?? t("search.piece","قطعة")}`,
              subtitle: `QR-${u.id.substring(0,8)} • طلب #${u.orders?.order_number ?? ""} • ${u.current_stage ?? u.status ?? "مفتوح"}`,
              badge: u.current_stage ?? u.status ?? t("search.open","مفتوح"),
              url: `/orders/${u.order_id}`,
            }));
          }
        }
      }

      if (matches.length === 0 && !isNaN(Number(clean))) {
        const { data: recent } = await supabase.from("orders")
          .select("id, order_number, status, total")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(20);
        
        (recent ?? [])
          .filter((o:any) => String(o.order_number).includes(clean))
          .slice(0,3)
          .forEach((o:any) => pushUnique({
            type: "order", 
            id: o.id, 
            title: `طلب #${o.order_number}`, 
            subtitle: `${Number(o.total ?? 0).toFixed(2)} ج.م`, 
            badge: o.status, 
            url: `/orders/${o.id}`
          }));
      }

      setResults(matches);
    } catch(err: any) { 
      setError(err?.message ?? String(err)); 
      setResults([]); 
    } finally { 
      setLoading(false); 
    }
  }, [tenantId, t]);

  const onChange = (v: string) => {
    setQuery(v);
    if (!open) setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => performSearch(v), 220);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  };

  const handleResultClick = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative w-72 md:w-80 shrink-0">
      <div className="relative">
        <Search className="w-4 h-4 text-teal-600 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        
        <Input
          ref={inputRef}
          value={query}
          onFocus={handleFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              window.location.href = results[0].url;
              handleClose();
            }
            if (e.key === "Escape") {
              handleClose();
            }
          }}
          placeholder={t("search.placeholder", "بحث موحد (هاتف، QR، طلب)...")}
          aria-label={t("search.openAria", "فتح البحث الموحد")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-9 w-full rounded-xl bg-slate-50 border-slate-200 ps-9 pe-14 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500"
        />

        {/* Keyboard hint */}
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 border absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "⌘K" : "Ctrl+K"}
        </kbd>

        {/* Clear button */}
        {query && (
          <button 
            onClick={handleClose}
            className="absolute end-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown - غير عائم */}
      {open && (
        <div 
          className="absolute top-full mt-1 w-full z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          dir={dir}
        >
          {/* No Tenant Warning */}
          {!tenantId && (
            <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {t("search.noTenant", "لم يتم تحديد مغسلة — سجّل دخولك أولاً")}
                <div className="mt-1 font-normal text-amber-700 text-[10px]">
                  {t("search.noTenantHelp", "اذهب إلى /login ثم اختر المغسلة / الفرع")}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-3 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div>{t("search.errorTitle", "فشل البحث")}</div>
                <div className="font-mono text-[10px] text-red-600 mt-1 break-all" dir="ltr">{error}</div>
              </div>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto p-2">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> 
                {t("common.loading", "جاري التحميل")}
              </div>
            )}

            {/* No Results */}
            {!loading && results.length === 0 && query.trim().length > 0 && !error && (
              <div className="p-6 text-center text-xs text-muted-foreground font-bold space-y-3">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p>{t("search.noResults", "لا توجد نتائج مطابقة لبحثك في قاعدة البيانات.")}</p>
                <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                  {t("search.noResultsHelp", "جرّب: رقم طلب مثل 91 أو 34 — أو جزء من رقم هاتف — أو أول 6 حروف من QR — أو اسم عميل")}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 pt-2 text-[10px]">
                  {["91", "34", "010", "dry"].map(ex => (
                    <button 
                      key={ex}
                      onClick={() => onChange(ex)} 
                      className="px-3 py-1 rounded-full bg-slate-100 hover:bg-teal-50 border text-slate-700 transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && query.trim().length === 0 && !error && (
              <div className="p-5 text-center text-xs text-muted-foreground font-semibold space-y-4">
                <div className="flex justify-center gap-6 text-slate-500 flex-wrap">
                  <div className="flex flex-col items-center gap-1"><QrCode className="w-5 h-5 text-teal-600" /><span>{t("search.qr", "كود QR")}</span></div>
                  <div className="flex flex-col items-center gap-1"><Phone className="w-5 h-5 text-blue-600" /><span>{t("search.phone", "هاتف")}</span></div>
                  <div className="flex flex-col items-center gap-1"><User className="w-5 h-5 text-indigo-600" /><span>{t("search.name", "اسم")}</span></div>
                  <div className="flex flex-col items-center gap-1"><FileText className="w-5 h-5 text-amber-600" /><span>{t("search.order", "طلب")}</span></div>
                </div>
                <p className="leading-relaxed max-w-[260px] mx-auto text-[11px]">
                  {t("search.subtext", "يدعم المحرك البحث اللحظي الموحد في سجلات التشغيل والعملاء والفواتير.")}
                </p>
                <div className="text-[10px] text-teal-700 font-bold">
                  {t("search.tryExamples", "أمثلة حية: 91 • 34 • 010 • QR-")}
                </div>
              </div>
            )}

            {/* Results List */}
            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((r, i) => (
                  <Link 
                    key={`${r.type}-${r.id}-${i}`} 
                    to={r.url} 
                    onClick={handleResultClick}
                    className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-slate-50 hover:border-teal-200 transition group block"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition">
                        {r.type === "order" ? <FileText className="w-4 h-4" /> : 
                         r.type === "customer" ? <User className="w-4 h-4" /> : 
                         <QrCode className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5" dir="auto">{r.subtitle}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white border-slate-200 text-[10px] font-bold px-2.5 py-0.5 ms-3 shrink-0">
                      {r.badge}
                    </Badge>
                  </Link>
                ))}
                
                <div className="pt-2 border-t border-slate-100 text-[10px] text-center text-slate-400 px-2 pb-1">
                  {results.length} {t("search.resultsCount", "نتيجة • Enter لفتح الأولى • Esc للإغلاق")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
