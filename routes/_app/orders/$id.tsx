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
import { Loader2, Plus, QrCode, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import QRCode from "qrcode";
import { PrintInvoiceButton } from "@/components/print-invoice";
import { StatusBadge } from "@/components/status-dot";
import type { StatusLevel } from "@/components/status-dot";

export const Route = createFileRoute("/_app/orders/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الطلب - MJRH" }] }),
  component: OrderDetailPage,
});

const GARMENT_TYPES = ["قميص","بنطلون","جاكيت","بدلة","عباية","فستان","تيشيرت","جيبة","معطف","أخرى"];
const COMPLEXITY: Record<string,number> = {
  "تيشيرت":1,"قميص":2,"بنطلون":2,"جيبة":2,"عباية":3,"جاكيت":3,"معطف":4,"بدلة":5,"فستان":8,"أخرى":1
};

function statusLevel(s: string): StatusLevel {
  if (s === "delivered") return "ok";
  if (["ready","packing"].includes(s)) return "waiting";
  if (s === "quality_check") return "attention";
  return "waiting";
}

type ServiceUnit = {
  id: string; unit_number: number; qr_code: string; qr_image_url?: string;
  attributes: Record<string,string>; status: string; current_stage: string;
  complexity_factor: number; customer_notes?: string; staff_notes?: string;
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, hasRole } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [units, setUnits] = useState<ServiceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUnit, setAddingUnit] = useState(false);
  const [form, setForm] = useState({ garment_type: "قميص", color: "", brand: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ord }, { data: su }] = await Promise.all([
      supabase.from("orders").select("*,customers(full_name,phone)").eq("id", id).single(),
      (supabase as any).from("service_units").select("*").eq("order_id", id).order("unit_number"),
    ]);
    setOrder(ord);
    setUnits((su ?? []) as ServiceUnit[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addUnit() {
    if (!form.garment_type) return;
    setAddingUnit(true);
    const complexity = COMPLEXITY[form.garment_type] ?? 1;

    // Insert unit
    const { data: unit, error } = await (supabase as any)
      .from("service_units")
      .insert({
        order_id: id,
        attributes: { garment_type: form.garment_type, color: form.color, brand: form.brand },
        complexity_factor: complexity,
        customer_notes: form.notes || null,
        status: "received",
        current_stage: "received",
        tenant_id: order?.tenant_id,
      })
      .select()
      .single();

    if (error) { setAddingUnit(false); return toast.error(error.message); }

    // Generate QR image and save
    try {
      const qrDataUrl = await QRCode.toDataURL(unit.qr_code, { width: 300, margin: 1 });
      const blob = await (await fetch(qrDataUrl)).blob();
      const path = `qr/${unit.qr_code}.png`;
      await supabase.storage.from("unit-media").upload(path, blob, { contentType: "image/png", upsert: true });
      const { data: urlData } = supabase.storage.from("unit-media").getPublicUrl(path);
      await (supabase as any).from("service_units").update({ qr_image_url: urlData.publicUrl }).eq("id", unit.id);
    } catch {}

    toast.success(`تمت إضافة القطعة #${unit.unit_number || "?"}`);
    setForm({ garment_type: "قميص", color: "", brand: "", notes: "" });
    setAddingUnit(false);
    load();
  }

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!order) return <div className="p-8 text-center text-muted-foreground">الطلب غير موجود</div>;

  const canEdit = hasRole("cs_manager","ops_manager","owner");

  return (
    <div className="space-y-5 max-w-3xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">طلب #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{order.customers?.full_name} · {order.customers?.phone}</p>
        </div>
        <div className="flex gap-2">
          <PrintInvoiceButton order={{ ...order, customers: order.customers, order_items: [] }} />
          <StatusBadge level={statusLevel(order.status)} label={order.status} />
        </div>
      </div>

      {/* Units List */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4 text-teal-600" />
          القطع ({units.length})
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {units.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد قطع بعد — أضف أول قطعة أدناه</p>
          )}
          {units.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50">
              {u.qr_image_url ? (
                <img src={u.qr_image_url} alt="QR" className="w-14 h-14 rounded border" />
              ) : (
                <div className="w-14 h-14 rounded border bg-slate-200 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  قطعة #{u.unit_number}
                  <StatusBadge level={statusLevel(u.current_stage)} label={u.current_stage} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {u.attributes?.garment_type}
                  {u.attributes?.color ? ` · ${u.attributes.color}` : ""}
                  {u.attributes?.brand ? ` · ${u.attributes.brand}` : ""}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{u.qr_code}</div>
                {u.customer_notes && <div className="text-xs text-amber-700 mt-1">📝 {u.customer_notes}</div>}
              </div>
              <div className="text-xs text-center">
                <div className="font-bold text-teal-700">×{u.complexity_factor}</div>
                <div className="text-muted-foreground">جهد</div>
              </div>
            </div>
          ))}

          {/* Add unit form */}
          {canEdit && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-bold">إضافة قطعة جديدة</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">نوع القطعة</label>
                  <Select value={form.garment_type} onValueChange={(v) => setForm(f => ({ ...f, garment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GARMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">اللون (اختياري)</label>
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="أبيض، أزرق..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الماركة (اختياري)</label>
                  <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="زارا، H&M..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ملاحظات العميل</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="أي ملاحظات خاصة على القطعة..." />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">معامل الجهد: <b className="text-teal-700">×{COMPLEXITY[form.garment_type] ?? 1}</b></span>
                <Button onClick={addUnit} disabled={addingUnit} size="sm">
                  {addingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ms-1" />إضافة + توليد QR</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
