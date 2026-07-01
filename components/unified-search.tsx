import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Search, Loader2, QrCode, Phone, User, FileText, Package, AlertTriangle } from "lucide-react";

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      if (trigger && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      const tm = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(tm);
    } else {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  const performSearch = useCallback(async (q: string) => {
    setError(null);
    if (!q.trim()) { setResults([]); return; }
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
      const pushUnique = (m: SearchMatch) => { const k = `${m.type}:${m.id}`; if (!seen.has(k)) { seen.add(k); matches.push(m); } };
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
        const { data: recent } = await supabase.from("orders").select("id, order_number, status, total").eq("tenant_id", tenantId).order("created_at", {ascending:false}).limit(20);
        (recent ?? []).filter((o:any)=>String(o.order_number).includes(clean)).slice(0,3).forEach((o:any)=>pushUnique({
          type:"order", id:o.id, title:`طلب #${o.order_number}`,
          subtitle:`${Number(o.total ?? 0).toFixed(2)} ج.م`, badge:o.status, url:`/orders/${o.id}`
        }));
      }
      setResults(matches);
    } catch(err:any){ setError(err?.message ?? String(err)); setResults([]);} 
    finally { setLoading(false); }
  }, [tenantId, t]);

  const onChange = (v:string)=>{ setQuery(v); if(debounceRef.current) window.clearTimeout(debounceRef.current); debounceRef.current= window.setTimeout(()=>performSearch(v),220); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={()=>setOpen(true)} className="h-9 w-60 rounded-xl bg-slate-50 border-slate-200 px-3 text-xs text-muted-foreground shadow-sm flex items-center justify-between hover:bg-slate-100 transition" aria-label={t("search.openAria","فتح البحث الموحد")}>
          <span className="flex items-center gap-2"><Search className="w-4 h-4 text-teal-600" />{t("search.placeholder","بحث موحد (هاتف، QR، طلب)...")}</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 border">{typeof navigator!=="undefined"&&navigator.platform.toUpperCase().indexOf("MAC")>=0?"⌘K":"Ctrl+K"}</kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 border-0 rounded-3xl overflow-hidden shadow-2xl bg-white" dir={dir} aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("search.title","بحث موحد")}</DialogTitle>
        <div className="flex items-center border-b border-slate-100 px-4 py-3 bg-slate-50/80">
          <Search className="w-5 h-5 text-teal-600 shrink-0 me-3" />
          <Input ref={inputRef} placeholder={t("search.modalPrompt","اكتب رقم هاتف، كود QR، اسم عميل، أو رقم طلب...")} value={query} onChange={(e)=>onChange(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&results[0]){window.location.href=results[0].url; setOpen(false);}}} className="flex-1 border-0 bg-transparent shadow-none text-base font-bold focus-visible:ring-0 px-0" autoComplete="off" autoCorrect="off" spellCheck={false} />
          {loading && <Loader2 className="w-5 h-5 animate-spin text-teal-600 shrink-0 ms-2" />}
          {!loading && query && <button onClick={()=>onChange("")} className="text-[10px] text-slate-400 hover:text-slate-600 ms-2">{t("search.clear","مسح")}</button>}
        </div>
        {!tenantId && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{t("search.noTenant","لم يتم تحديد مغسلة — سجّل دخولك أولاً")}<div className="mt-1 font-normal text-amber-700">{t("search.noTenantHelp","اذهب إلى /login ثم اختر المغسلة / الفرع")}</div></div>
          </div>
        )}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div><div>{t("search.errorTitle","فشل البحث")}</div><div className="font-mono text-[10px] text-red-600 mt-1 break-all" dir="ltr">{error}</div></div>
          </div>
        )}
        <div className="max-h-[420px] overflow-y-auto p-4 space-y-2">
          {results.length === 0 && query.trim().length > 0 && !loading && !error && (
            <div className="p-10 text-center text-xs text-muted-foreground font-bold space-y-3">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{t("search.noResults","لا توجد نتائج مطابقة لبحثك في قاعدة البيانات.")}</p>
              <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{t("search.noResultsHelp","جرّب: رقم طلب مثل 91 أو 34 — أو جزء من رقم هاتف — أو أول 6 حروف من QR — أو اسم عميل")}</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-[10px]">
                <button onClick={()=>onChange("91")} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border text-slate-700">91</button>
                <button onClick={()=>onChange("34")} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border text-slate-700">34</button>
                <button onClick={()=>onChange("010")} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border text-slate-700">010</button>
                <button onClick={()=>onChange("dry")} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border text-slate-700">dry</button>
              </div>
            </div>
          )}
          {results.length === 0 && query.trim().length === 0 && !error && (
            <div className="p-6 text-center text-xs text-muted-foreground font-semibold space-y-4">
              <div className="flex justify-center gap-5 text-slate-500 flex-wrap">
                <div className="flex flex-col items-center gap-1 min-w-[64px]"><QrCode className="w-6 h-6 text-teal-600" /><span>{t("search.qr","كود QR")}</span></div>
                <div className="flex flex-col items-center gap-1 min-w-[64px]"><Phone className="w-6 h-6 text-blue-600" /><span>{t("search.phone","هاتف")}</span></div>
                <div className="flex flex-col items-center gap-1 min-w-[64px]"><User className="w-6 h-6 text-indigo-600" /><span>{t("search.name","اسم")}</span></div>
                <div className="flex flex-col items-center gap-1 min-w-[64px]"><FileText className="w-6 h-6 text-amber-600" /><span>{t("search.order","طلب")}</span></div>
              </div>
              <p className="leading-relaxed max-w-sm mx-auto">{t("search.subtext","يدعم المحرك البحث اللحظي الموحد في سجلات التشغيل والعملاء والفواتير.")}</p>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div><kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">Ctrl+K</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">⌘K</kbd> {t("search.openHint","فتح البحث")}</div>
                <div><kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">/</kbd> {t("search.slashHint","فتح سريع")} • <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">Esc</kbd> {t("search.closeHint","إغلاق")}</div>
                <div className="text-teal-700 font-bold">{t("search.tryExamples","أمثلة حية من Dry Tech: 91 • 34 • 010 • QR-")}</div>
              </div>
            </div>
          )}
          {results.map((r,i)=>(
            <Link key={`${r.type}-${r.id}-${i}`} to={r.url} onClick={()=>setOpen(false)} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition group block">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition">
                  {r.type==="order"?<FileText className="w-5 h-5"/>:r.type==="customer"?<User className="w-5 h-5"/>:<QrCode className="w-5 h-5"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5" dir="auto">{r.subtitle}</div>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-slate-200 text-[10px] font-bold px-2.5 py-1 ms-3 shrink-0">{r.badge}</Badge>
            </Link>
          ))}
          {results.length>0 && (
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
              {results.length} {t("search.resultsCount","نتيجة • Enter لفتح الأولى • Esc للإغلاق")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
