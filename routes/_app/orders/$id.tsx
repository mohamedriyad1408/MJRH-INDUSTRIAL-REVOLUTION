import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Camera, CheckCircle2, AlertTriangle, Printer, Scale, RotateCcw, ArrowRight } from "lucide-react";
import { PrintInvoiceButton } from "@/components/print-invoice";
import { StatusBadge } from "@/components/status-dot";
import type { StatusLevel } from "@/components/status-dot";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";

export const Route = createFileRoute("/_app/orders/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الطلب - MJRH" }] }),
  component: OrderDetailPage,
});

const GARMENT_TYPES = ["قميص", "بلوزة", "بنطلون", "جاكيت", "بدلة", "عباية", "فستان", "تيشيرت", "جيبة", "معطف", "أخرى"];
const COMPLEXITY: Record<string, number> = {
  "تيشيرت": 1, "قميص": 2, "بلوزة": 2, "بنطلون": 2, "جيبة": 2, "عباية": 3, "جاكيت": 3, "معطف": 4, "بدلة": 5, "فستان": 8, "أخرى": 1,
};

function isShirtLikeName(name: string) { return /قميص|بلوز|shirt|blouse/i.test(name); }
function complexityForName(name: string) { return COMPLEXITY[name] ?? (isShirtLikeName(name) ? 2 : 1); }

function statusLevel(s: string): StatusLevel {
  if (["delivered", "ready"].includes(s)) return "ok";
  if (["packing", "ironing"].includes(s)) return "attention";
  if (s === "cancelled") return "urgent";
  return "waiting";
}

type ServiceUnit = {
  id: string;
  unit_number: number;
  label_code: string;
  name: string;
  garment_type: string;
  service_type: string;
  unit_price: number;
  line_value: number;
  attributes?: Record<string, string>;
  status: string;
  current_stage: string;
  complexity_factor: number;
  is_shirt_like: boolean;
  photo_url?: string | null;
  customer_notes?: string | null;
  staff_notes?: string | null;
  assigned_ironing_employee_id?: string | null;
  needs_reclean: boolean;
  reclean_reason?: string | null;
  reclean_reported_at?: string | null;
  employees?: { full_name: string } | null;
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, hasRole } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [units, setUnits] = useState<ServiceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUnit, setAddingUnit] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({ garment_type: "قميص", color: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ord }, { data: su }] = await Promise.all([
      supabase.from("orders").select("*,customers(full_name,phone),order_items(*)").eq("id", id).single(),
      (supabase as any)
        .from("service_units")
        .select("*,employees:assigned_ironing_employee_id(full_name)")
        .eq("order_id", id)
        .order("unit_number"),
    ]);
    setOrder(ord);
    setUnits((su ?? []) as ServiceUnit[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addUnit() {
    if (!form.garment_type) return;
    setAddingUnit(true);
    const { error } = await (supabase as any)
      .from("service_units")
      .insert({
        order_id: id,
        name: form.garment_type,
        garment_type: form.garment_type,
        service_type: "both",
        unit_price: 0,
        line_value: 0,
        attributes: { color: form.color },
        complexity_factor: complexityForName(form.garment_type),
        is_shirt_like: isShirtLikeName(form.garment_type),
        customer_notes: form.notes || null,
        status: order?.status ?? "received",
        current_stage: order?.status ?? "received",
        tenant_id: order?.tenant_id,
      });
    setAddingUnit(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة القطعة");
    setForm({ garment_type: "قميص", color: "", notes: "" });
    load();
  }

  async function uploadPhoto(unit: ServiceUnit, file: File) {
    setUploading(unit.id);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${id}/pieces/${unit.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("unit-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(null); return toast.error(error.message); }
    const { data } = supabase.storage.from("unit-media").getPublicUrl(path);
    const { error: uErr } = await (supabase as any).from("service_units").update({ photo_url: data.publicUrl }).eq("id", unit.id);
    setUploading(null);
    if (uErr) return toast.error(uErr.message);
    toast.success("تم حفظ صورة القطعة");
    load();
  }

  async function markReclean(unit: ServiceUnit) {
    const reason = prompt("سبب رجوع القطعة للتنظيف؟", unit.reclean_reason ?? "");
    if (reason === null) return;
    const { error } = await (supabase as any).from("service_units").update({
      needs_reclean: true,
      reclean_reason: reason || "مرتجع تنظيف",
      reclean_reported_by: user?.id,
      reclean_reported_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success("تم تسجيل مرتجع التنظيف"); load(); }
  }

  async function resolveReclean(unit: ServiceUnit) {
    const { error } = await (supabase as any).from("service_units").update({
      needs_reclean: false,
      reclean_resolved_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success("تم إنهاء مرتجع التنظيف"); load(); }
  }

  async function assignIroning() {
    setAssigning(true);
    try {
      const r = await autoAssignIroningPieces(id);
      toast.success(r.assigned ? `تم توزيع ${r.assigned} قطعة على فنيي الكي` : "لا توجد قطع كي غير موزعة");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر توزيع الكي");
    } finally {
      setAssigning(false);
    }
  }

  function printLabels() {
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Labels</title><style>
      @page{size:50mm 30mm;margin:2mm} body{font-family:Arial,sans-serif;margin:0;color:#111}.label{width:46mm;height:26mm;border:1px dashed #999;margin:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;text-align:center}.code{font-size:18px;font-weight:900}.name{font-size:13px;font-weight:700}.meta{font-size:10px;color:#444}
    </style></head><body>${units.map((u) => `<div class="label"><div class="code">${u.label_code}</div><div class="name">${u.name}</div><div class="meta">طلب #${order.order_number} — ${order.customers?.full_name ?? ""}</div></div>`).join("")}</body></html>`;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return toast.error("المتصفح منع فتح نافذة الطباعة");
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!order) return <div className="p-8 text-center text-muted-foreground">الطلب غير موجود</div>;

  const canEdit = hasRole("cs_manager", "ops_manager", "owner");
  const canOperate = hasRole("ops_manager", "owner", "employee");
  const pieceCount = units.length;
  const shirtCount = units.filter((u) => u.is_shirt_like).length;
  const invoiceValue = units.reduce((s, u) => s + Number(u.line_value ?? 0), 0);
  const recleanUnits = units.filter((u) => u.needs_reclean);

  return (
    <div className="space-y-5 max-w-4xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/orders"><ArrowRight className="w-4 h-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">طلب #{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">{order.customers?.full_name} · {order.customers?.phone}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintInvoiceButton order={{ ...order, customers: order.customers, order_items: order.order_items ?? [] }} />
          <Button variant="outline" onClick={printLabels} disabled={!units.length}><Printer className="w-4 h-4 ms-1" /> طباعة ليبل القطع</Button>
          {canEdit && <Button onClick={assignIroning} disabled={assigning || !units.length}><Scale className="w-4 h-4 ms-1" /> {assigning ? "توزيع..." : "توزيع الكي"}</Button>}
          <StatusBadge level={statusLevel(order.status)} label={order.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">عدد القطع</div><div className="text-xl font-black">{pieceCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">قمصان/بلوزات</div><div className="text-xl font-black">{shirtCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">قيمة القطع</div><div className="text-xl font-black">{invoiceValue.toLocaleString()} ج</div></CardContent></Card>
        <Card className={recleanUnits.length ? "border-amber-300 bg-amber-50" : ""}><CardContent className="p-3"><div className="text-xs text-muted-foreground">مرتجعات تنظيف</div><div className="text-xl font-black">{recleanUnits.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4 text-teal-600" /> القطع المسجلة ({units.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {units.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد قطع بعد — أضف القطع من هنا أو من بنود الطلب.</p>}
          {units.map((u) => (
            <div key={u.id} className="grid md:grid-cols-[88px_1fr_auto] gap-3 p-3 border rounded-xl bg-card">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <Camera className="w-7 h-7 text-muted-foreground" />}
                </div>
                {canEdit && <label className="text-xs text-teal-700 cursor-pointer underline">
                  {uploading === u.id ? "رفع..." : "صورة"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(u, e.target.files[0])} />
                </label>}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-lg">{u.label_code}</span>
                  <Badge variant="outline">{u.name}</Badge>
                  {u.is_shirt_like && <Badge className="bg-blue-600">قميص/بلوزة</Badge>}
                  {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> مرتجع تنظيف</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.attributes?.color ? `اللون: ${u.attributes.color} · ` : ""}
                  قيمة تقديرية: {Number(u.line_value ?? 0).toLocaleString()} ج · جهد ×{u.complexity_factor}
                </div>
                <div className="text-xs text-muted-foreground">
                  فني الكي: <b>{u.employees?.full_name ?? "لم يوزع بعد"}</b>
                </div>
                {u.customer_notes && <div className="text-xs text-amber-700">📝 {u.customer_notes}</div>}
                {u.needs_reclean && <div className="text-xs text-amber-700">سبب المرتجع: {u.reclean_reason}</div>}
              </div>
              {canOperate && <div className="flex md:flex-col gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => markReclean(u)}><AlertTriangle className="w-3 h-3 ms-1" /> مرتجع تنظيف</Button>
                {u.needs_reclean && <Button size="sm" onClick={() => resolveReclean(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> تم تنظيفه</Button>}
              </div>}
            </div>
          ))}

          {canEdit && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-bold">إضافة قطعة يدوية</p>
              <div className="grid md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">نوع القطعة</label>
                  <Select value={form.garment_type} onValueChange={(v) => setForm((f) => ({ ...f, garment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GARMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">اللون</label>
                  <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="أبيض، أزرق..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ملاحظات</label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={1} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ستظهر على الليبل باسم القطعة ورقمها داخل الطلب.</span>
                <Button onClick={addUnit} disabled={addingUnit} size="sm">
                  {addingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ms-1" /> إضافة قطعة</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
