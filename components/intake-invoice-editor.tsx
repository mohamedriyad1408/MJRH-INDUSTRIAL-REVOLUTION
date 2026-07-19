import { useEffect, useState, useMemo } from"react";
import { supabase } from"@/integrations/supabase/client";
import { useAuth } from"@/core/auth/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from"@/components/ui/dialog";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Badge } from"@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { toast } from"sonner";
import { Loader2, Plus, Trash2, Receipt, Sparkles, Shirt, ShoppingBag, CheckCircle2, Save } from"lucide-react";
import { fmtMoney } from"@/lib/format";
import { type ActiveActor } from"@/components/station-actor-widget";
import { DRY_TECH_CATALOG_SEED, ensureDryTechCatalogSeeded } from"@/lib/dry-tech-catalog";
import { PosCategoryTabs, type ServiceTypeFilter } from"@/components/pos-category-tabs";

type ServiceItem = { id: string; name: string; unit_price: number; service_type: string; category?: string };
type OrderItem = { id?: string; service_item_id?: string | null; name: string; qty: number; unit_price: number; service_type: string };

type Props = {
 open: boolean;
 onOpenChange: (val: boolean) => void;
 orderId: string | null;
 pickupId?: string | null;
 customerName?: string;
 phone?: string;
 activeActor: ActiveActor | null;
 onSaved: () => void;
};

export function IntakeInvoiceEditorModal({ open, onOpenChange, orderId, pickupId, customerName, phone, activeActor, onSaved }: Props) {
 const { tenantId, user } = useAuth();
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [catalog, setCatalog] = useState<ServiceItem[]>([]);
 const [catTab, setCatTab] = useState("all");
 const [serviceType, setServiceType] = useState<ServiceTypeFilter>("all");
 const [items, setItems] = useState<OrderItem[]>([]);
 const [customName, setCustomName] = useState("");
 const [customPrice, setCustomPrice] = useState("");
 const [selectedServiceId, setSelectedServiceId] = useState("");
 const [orderData, setOrderData] = useState<any>(null);

 useEffect(() => {
 if (!open || !tenantId) return;
 setLoading(true);
 ensureDryTechCatalogSeeded(tenantId).then(() => {
 Promise.all([
 supabase.from("service_items").select("id,name,unit_price,service_type,category").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
 orderId ? supabase.from("orders").select("*").eq("id", orderId).maybeSingle() : Promise.resolve({ data: null }),
 orderId ? supabase.from("order_items").select("*").eq("order_id", orderId) : Promise.resolve({ data: [] }),
 ]).then(([catRes, ordRes, itemsRes]) => {
 setCatalog(((catRes.data ?? []) as any[]).map(x => ({ id: x.id, name: x.name, unit_price: Number(x.unit_price ?? 0), service_type: x.service_type, category: x.category })));
 setOrderData(ordRes.data);
 if (itemsRes.data && itemsRes.data.length > 0) {
 setItems(itemsRes.data.map((it: any) => ({ id: it.id, service_item_id: it.service_item_id, name: it.name, qty: Number(it.qty ?? 1), unit_price: Number(it.unit_price ?? 0), service_type: it.service_type ||"both"})));
 } else {
 setItems([]);
 }
 setLoading(false);
 });
 });
 }, [open, tenantId, orderId]);

 function addFromCatalog(id: string) {
 const svc = catalog.find(x => x.id === id);
 if (!svc) return;
 setItems(prev => {
 const idx = prev.findIndex(x => x.service_item_id === id);
 if (idx >= 0) {
 const copy = [...prev];
 copy[idx].qty += 1;
 return copy;
 }
 return [...prev, { service_item_id: svc.id, name: svc.name, qty: 1, unit_price: svc.unit_price, service_type: svc.service_type }];
 });
 setSelectedServiceId("");
 }

 function addCustomItem() {
 if (!customName.trim() || !Number(customPrice)) {
 return toast.error("أدخل اسم الصنف والسعر");
 }
 setItems(prev => [...prev, { name: customName.trim(), qty: 1, unit_price: Number(customPrice), service_type:"both"}]);
 setCustomName(""); setCustomPrice("");
 }

 function updateQty(idx: number, delta: number) {
 setItems(prev => {
 const copy = [...prev];
 copy[idx].qty = Math.max(1, copy[idx].qty + delta);
 return copy;
 });
 }

 function removeItem(idx: number) {
 setItems(prev => prev.filter((_, i) => i !== idx));
 }

 const totals = useMemo(() => {
 const subtotal = items.reduce((s, it) => s + (it.qty * it.unit_price), 0);
 const urgentFee = orderData?.is_urgent ? subtotal * 0.5 : 0;
 return { subtotal, urgentFee, total: subtotal + urgentFee, totalPieces: items.reduce((s, it) => s + it.qty, 0) };
 }, [items, orderData]);

 async function saveInvoice() {
 if (!items.length) {
 return toast.error("يجب إضافة قطعة أو خدمة واحدة على الأقل للفاتورة");
 }
 setSaving(true);
 let targetOrderId = orderId;

 try {
 if (!targetOrderId) {
 let customerId = orderData?.customer_id;
 if (!customerId && phone && tenantId) {
 const { data: cust } = await supabase.from("customers").select("id").eq("tenant_id", tenantId).eq("phone", phone).maybeSingle();
 if (cust) {
 customerId = cust.id;
 } else {
 const { data: newCust, error: cErr } = await supabase.from("customers").insert({
 tenant_id: tenantId, full_name: customerName ||"عميل استلام", phone: phone ||"01000000000",
 }).select("id").single();
 if (cErr) throw cErr;
 customerId = newCust!.id;
 }
 }

 const { data: newOrd, error: ordErr } = await supabase.from("orders").insert({
 tenant_id: tenantId,
 customer_id: customerId || null,
 order_type:"delivery",
 status:"received",
 subtotal: totals.subtotal,
 total: totals.total,
 notes:`طلب استلام (Intake) — العميل: ${customerName ||""} (${phone ||""})`,
 created_by: user?.id,
 }).select("id").single();
 if (ordErr) throw ordErr;
 targetOrderId = newOrd!.id;

 if (pickupId) {
 await supabase.from("pickup_requests").update({ converted_order_id: targetOrderId, status:"picked_up", customer_id: customerId }).eq("id", pickupId);
 }
 } else {
 await supabase.from("orders").update({
 subtotal: totals.subtotal,
 total: totals.total,
 }).eq("id", targetOrderId);
 }

 await supabase.from("order_items").delete().eq("order_id", targetOrderId);
 const { data: insertedItems, error: insErr } = await supabase.from("order_items").insert(
 items.map(it => ({
 tenant_id: tenantId,
 order_id: targetOrderId!,
 service_item_id: it.service_item_id || null,
 name: it.name,
 qty: it.qty,
 unit_price: it.unit_price,
 service_type: (it.service_type ||"both") as any,
 }))
).select("id,name,qty,unit_price,service_type");
 if (insErr) throw insErr;

 await supabase.from("service_units").delete().eq("order_id", targetOrderId).in("current_stage", ["received","sorting"]);
 const unitsToInsert: any[] = [];
 let unitNo = 1;
 (insertedItems ?? []).forEach((it: any) => {
 const q = Math.max(1, Number(it.qty || 1));
 for (let n = 0; n < q; n++) {
 unitsToInsert.push({
 tenant_id: tenantId,
 order_id: targetOrderId,
 order_item_id: it.id,
 unit_number: unitNo++,
 name: it.name,
 garment_type: it.name,
 service_type: it.service_type ||"both",
 unit_price: Number(it.unit_price || 0),
 line_value: Number(it.unit_price || 0),
 status:"received",
 current_stage:"received",
 });
 }
 });
 if (unitsToInsert.length > 0) {
 await supabase.from("service_units").insert(unitsToInsert);
 }

 await supabase.from("order_status_history").insert({
 order_id: targetOrderId, from_status:"received", to_status:"received",
 changed_by: user?.id, notes:`مراجعة وتعديل أصناف فاتورة الاستلام (${totals.totalPieces} قطعة) — نفذه: ${activeActor?.full_name ??"موظف المحطة"}`,
 });

 toast.success(`تم مراجعة وحفظ فاتورة الاستلام بنجاح بإجمالي (${fmtMoney(totals.total)}) لعدد ${totals.totalPieces} قطعة`);
 onSaved();
 onOpenChange(false);
 } catch (err: any) {
 toast.error("خطأ في حفظ فاتورة الاستلام:"+ (err?.message ||""));
 } finally {
 setSaving(false);
 }
 }

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"dir="rtl">
 <DialogHeader className="border-b pb-3">
 <DialogTitle className="text-xl font-black text-slate-900 flex items-center justify-between">
 <span className="flex items-center gap-2"><Receipt className="w-6 h-6 text-amber-600"/> دفتر مراجعة وتعديل أصناف فاتورة الاستلام (Intake Invoice)</span>
 <Badge className="bg-amber-500 text-white font-black">{totals.totalPieces} قطعة</Badge>
 </DialogTitle>
 <div className="text-xs text-slate-500 font-bold mt-1">
 العميل: <span className="text-slate-900">{customerName || orderData?.customers?.full_name ||"عميل استلام"}</span> — الهاتف: <span className="font-mono">{phone || orderData?.customers?.phone ||"—"}</span>
 </div>
 </DialogHeader>

 {loading ? (
 <div className="py-12 text-center space-y-2"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600"/><div className="text-xs font-bold text-slate-600">جاري تحميل أصناف وخدمات الفاتورة...</div></div>
) : (
 <div className="space-y-4">
 <div className="p-3.5 rounded-2xl bg-slate-50 border space-y-2.5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-teal-600"/> إضافة صنف من كتالوج المغسلة ({catalog.length} صنف):</Label>
 <Button type="button"size="sm"variant="outline"onClick={async () => {
 if (!tenantId) return;
 setLoading(true);
 await ensureDryTechCatalogSeeded(tenantId);
 const { data } = await supabase.from("service_items").select("id,name,unit_price,service_type").eq("tenant_id", tenantId).eq("is_active", true).order("name");
 setCatalog(((data ?? []) as any[]).map(x => ({ id: x.id, name: x.name, unit_price: Number(x.unit_price ?? 0), service_type: x.service_type })));
 setLoading(false);
 toast.success(`تم مزامنة وتحديث الكتالوج الكامل (${DRY_TECH_CATALOG_SEED.length} صنف من POS Touch)`);
 }} className="h-7 text-[11px] border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100 font-bold">
 <Sparkles className="w-3.5 h-3.5 ms-1 text-teal-600"/>
 <span> مزامنة كتالوج Dry Tech ({DRY_TECH_CATALOG_SEED.length} صنف)</span>
 </Button>
 </div>
 <PosCategoryTabs activeTab={catTab} onSelect={setCatTab} items={catalog} compact={true} activeServiceType={serviceType} onSelectServiceType={setServiceType} />
 <div className="flex gap-2">
 <Select value={selectedServiceId} onValueChange={(val) => { setSelectedServiceId(val); addFromCatalog(val); }}>
 <SelectTrigger className="bg-white rounded-xl font-bold text-xs h-10"><SelectValue placeholder="-- اضغط لاختيار الصنف (قميص، بنطلون، بدلة...) --"/></SelectTrigger>
 <SelectContent className="max-h-60">
 {catalog.filter(s => {
 const matchesCat = catTab ==="all"|| (s as any).category === catTab || (catTab ==="رجالي"&& !(s as any).category);
 const matchesType = !serviceType || serviceType ==="all"|| s.service_type === serviceType;
 return matchesCat && matchesType;
 }).map(s => (
 <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name} — ({s.unit_price} ج.م)</SelectItem>
))}
 </SelectContent>
 </Select>
 </div>

 <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 items-end">
 <div className="flex-1 min-w-[140px]">
 <Label className="text-[11px] text-slate-600 mb-1 block">صنف مخصص غير بالكتالوج:</Label>
 <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="اسم الصنف المخصص..."className="h-9 text-xs bg-white rounded-xl"/>
 </div>
 <div className="w-24">
 <Label className="text-[11px] text-slate-600 mb-1 block">السعر (ج.م):</Label>
 <Input type="number"value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="0"className="h-9 text-xs font-mono bg-white rounded-xl"/>
 </div>
 <Button type="button"size="sm"onClick={addCustomItem} variant="secondary"className="h-9 px-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300">
 <Plus className="w-3.5 h-3.5 ms-1"/> إضافة
 </Button>
 </div>
 </div>

 <div className="border rounded-2xl overflow-hidden bg-white">
 <table className="w-full text-xs">
 <thead className="bg-slate-100 text-slate-700 font-black border-b">
 <tr>
 <th className="p-3 text-start">الصنف والخدمة</th>
 <th className="p-3 text-center">الكمية</th>
 <th className="p-3 text-end">سعر الوحدة</th>
 <th className="p-3 text-end">الإجمالي</th>
 <th className="p-3 text-center">حذف</th>
 </tr>
 </thead>
 <tbody className="divide-y font-semibold">
 {items.length === 0 ? (
 <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-bold">لم تقم بإضافة أي أصناف للفاتورة بعد</td></tr>
) : items.map((it, i) => (
 <tr key={i} className="hover:bg-slate-50/70">
 <td className="p-3 font-bold text-slate-900">
 {it.name}
 <span className="block text-[10px] text-slate-400 font-mono">{it.service_type ==="ironing"?"كي فقط":"غسيل وكي"}</span>
 </td>
 <td className="p-3 text-center">
 <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border">
 <button type="button"onClick={() => updateQty(i, -1)} className="w-6 h-6 rounded-lg bg-white shadow-2xs font-black hover:bg-slate-200">-</button>
 <span className="w-6 text-center font-mono font-black">{it.qty}</span>
 <button type="button"onClick={() => updateQty(i, 1)} className="w-6 h-6 rounded-lg bg-white shadow-2xs font-black hover:bg-slate-200">+</button>
 </div>
 </td>
 <td className="p-3 text-end font-mono text-slate-600">{fmtMoney(it.unit_price)}</td>
 <td className="p-3 text-end font-mono font-black text-teal-700">{fmtMoney(it.qty * it.unit_price)}</td>
 <td className="p-3 text-center">
 <button type="button"onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
 </td>
 </tr>
))}
 </tbody>
 </table>
 </div>

 <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1.5 text-xs font-bold text-slate-700">
 <div className="flex justify-between"><span>مجموع أصناف الغسيل والكي:</span><span className="font-mono font-black">{fmtMoney(totals.subtotal)}</span></div>
 {totals.urgentFee > 0 && <div className="flex justify-between text-indigo-700"><span> رسم الاستعجال الإضافي:</span><span className="font-mono font-black">+{fmtMoney(totals.urgentFee)}</span></div>}
 <div className="flex justify-between pt-2 border-t border-amber-200 text-sm font-black text-amber-950">
 <span>الإجمالي النهائي لفاتورة الاستلام:</span>
 <span className="font-mono text-lg text-amber-900">{fmtMoney(totals.total)}</span>
 </div>
 </div>
 </div>
)}

 <DialogFooter className="border-t pt-3 gap-2 flex-col sm:flex-row">
 <Button variant="outline"onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-11">إلغاء</Button>
 <Button onClick={saveInvoice} disabled={saving || loading} className="bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-700 hover:to-teal-700 text-white font-black rounded-xl px-6 h-11 shadow-md flex-1">
 {saving ? <Loader2 className="w-5 h-5 animate-spin ms-1"/> : <Save className="w-5 h-5 ms-1"/>}
 <span> حفظ وتحديث الفاتورة وإصدار المارك ({totals.totalPieces} قطعة)</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
);
}
