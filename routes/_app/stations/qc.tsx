import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw, Package, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/stations/qc")({
  head: () => ({ meta: [{ title: "محطة الجودة QC" }] }),
  component: QcStation,
});

type Unit = {
  id: string;
  label_code: string;
  name: string;
  current_stage: string;
  needs_reclean: boolean;
  order_id: string;
  orders?: { id: string; order_number: number; status: string; customers?: { full_name: string; phone: string } | null } | null;
};

function QcStation() {
  const { hasRole, user } = useAuth();
  const canUse = hasRole("owner", "ops_manager", "employee");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("service_units")
      .select("id,label_code,name,current_stage,needs_reclean,order_id,orders(id,order_number,status,customers(full_name,phone))")
      .in("current_stage", ["cleaning_done", "ironing_done", "packing", "packing_done", "ready", "qc_failed"])
      .order("updated_at", { ascending: false })
      .limit(120);
    if (error) toast.error(error.message);
    setUnits((data ?? []).filter((u: any) => u.orders) as Unit[]);
    setLoading(false);
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);

  const groups = useMemo(() => {
    const map = new Map<string, Unit[]>();
    units.forEach((u) => map.set(u.order_id, [...(map.get(u.order_id) ?? []), u]));
    return Array.from(map.entries()).map(([orderId, rows]) => ({ orderId, order: rows[0].orders, units: rows }));
  }, [units]);

  async function qc(unit: Unit, res: "passed" | "reclean" | "repair" | "lost" | "damaged") {
    const note = (notes[unit.id] ?? "").trim();
    if (res !== "passed" && note.length < 3) return toast.error("اكتب سبب واضح قبل رفض القطعة");

    let error: any = null;
    if (res === "passed") {
      const r = await (supabase as any).rpc("pass_qc_unit", { _unit_id: unit.id, _notes: note || null });
      error = r.error;
    } else if (res === "reclean") {
      const r = await (supabase as any).rpc("register_reclean_return", { _unit_id: unit.id, _reason: note, _photo_url: null });
      error = r.error;
    } else {
      const r = await (supabase as any).rpc("register_qc_issue", { _unit_id: unit.id, _result: res, _reason: note });
      error = r.error;
    }

    if (error) toast.error(error.message);
    else {
      toast.success(res === "passed" ? "تم اعتماد القطعة" : res === "reclean" ? "تم رجوع القطعة للغسيل" : "تم تسجيل مشكلة الجودة وإشعار الإدارة");
      setNotes((m) => ({ ...m, [unit.id]: "" }));
      load();
    }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">محطة الجودة للتشغيل والمالك والفنيين فقط.</CardContent></Card>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="w-7 h-7" /> محطة الجودة QC</h1>
            <p className="text-sm text-white/70">آخر بوابة قبل التسليم: اعتماد، مرتجع تنظيف، تصليح، تالف أو مفقود.</p>
          </div>
          <Button variant="secondary" onClick={load}>تحديث</Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Mini label="طلبات تحت الفحص" value={groups.length} />
          <Mini label="قطع تحت الفحص" value={units.length} />
          <Mini label="مرتجعات ظاهرة" value={units.filter((u) => u.needs_reclean || u.current_stage === "qc_failed").length} warn />
        </div>
      </div>

      {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : (
        <div className="space-y-3">
          {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد قطع تنتظر فحص الجودة ✅</CardContent></Card>}
          {groups.map((g) => (
            <Card key={g.orderId} className="overflow-hidden">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-teal-600" /> طلب #{g.order?.order_number}<Badge variant="outline">{g.units.length} قطعة</Badge></CardTitle>
                  {g.order?.id && <Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: g.order.id }}>فتح الطلب <ArrowLeft className="w-3 h-3 me-1" /></Link></Button>}
                </div>
                <div className="text-xs text-muted-foreground">{g.order?.customers?.full_name ?? "—"} · {g.order?.customers?.phone ?? ""}</div>
              </CardHeader>
              <CardContent className="p-3 grid md:grid-cols-2 gap-3">
                {g.units.map((u) => (
                  <div key={u.id} className="rounded-2xl border p-3 bg-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div><div className="font-black">{u.label_code} — {u.name}</div><div className="text-xs text-muted-foreground">المرحلة: {u.current_stage}</div></div>
                      {(u.needs_reclean || u.current_stage === "qc_failed") && <Badge variant="destructive">مشكلة</Badge>}
                    </div>
                    <Textarea rows={2} placeholder="ملاحظة الفحص / سبب الرفض" value={notes[u.id] ?? ""} onChange={(e) => setNotes((m) => ({ ...m, [u.id]: e.target.value }))} />
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <Select value={result[u.id] ?? "reclean"} onValueChange={(v) => setResult((m) => ({ ...m, [u.id]: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reclean">مرتجع تنظيف</SelectItem>
                          <SelectItem value="repair">يحتاج تصليح / خياطة</SelectItem>
                          <SelectItem value="damaged">تالف</SelectItem>
                          <SelectItem value="lost">مفقود</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => qc(u, (result[u.id] ?? "reclean") as any)}><AlertTriangle className="w-4 h-4 ms-1" /> تسجيل المشكلة</Button>
                      <Button onClick={() => qc(u, "passed")} className="bg-emerald-600 hover:bg-emerald-500"><CheckCircle2 className="w-4 h-4 ms-1" /> اعتماد</Button>
                    </div>
                    {u.needs_reclean && <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">هذه القطعة مرجعة للغسيل. تظهر الآن في محطة الغسيل ولن تخرج للعميل حتى تنتهي دورة المرتجع.</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return <div className={`rounded-2xl p-3 border border-white/10 ${warn ? "bg-amber-400/15" : "bg-white/10"}`}><div className="text-xs text-white/70">{label}</div><div className="text-2xl font-black">{value}</div></div>;
}
