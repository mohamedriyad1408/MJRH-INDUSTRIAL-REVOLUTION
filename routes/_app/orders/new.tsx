import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/orders/new")({
  head: () => ({ meta: [{ title: "طلب جديد" }] }),
  component: NewOrderPage,
});

type Service = { id: string; name: string; service_type: string; unit_price: number; is_active: boolean };
type Customer = { id: string; full_name: string; phone: string };
type LineItem = { service_item_id: string; name: string; service_type: string; qty: number; unit_price: number };

function NewOrderPage() {
  const { hasRole, user } = useAuth();
  const canCreate = hasRole("cs_manager", "owner");
  const nav = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<{ urgent_service_fee: number; default_delivery_fee: number; tax_percent: number }>({ urgent_service_fee: 0, default_delivery_fee: 0, tax_percent: 0 });

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", address: "" });

  const [items, setItems] = useState<LineItem[]>([]);
  const [orderType, setOrderType] = useState<"walk_in" | "delivery">("walk_in");
  const [isUrgent, setIsUrgent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");
  const [discountPct, setDiscountPct] = useState("0");
  const [urgentFeeInput, setUrgentFeeInput] = useState("0");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("service_items").select("*").eq("is_active", true).order("name").then(({ data }) => setServices((data ?? []) as Service[]));
    supabase.from("app_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setSettings({ urgent_service_fee: Number(data.urgent_service_fee), default_delivery_fee: Number(data.default_delivery_fee), tax_percent: Number(data.tax_percent) });
        setDeliveryFee(String(data.default_delivery_fee));
      }
    });
  }, []);

  useEffect(() => {
    if (!customerSearch || customer) { setCustomerMatches([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("customers").select("id, full_name, phone")
        .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`).limit(8);
      setCustomerMatches((data ?? []) as Customer[]);
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch, customer]);

  if (!canCreate) return <Card className="p-8 text-center text-muted-foreground">صلاحية إنشاء الطلبات متاحة لخدمة العملاء والمالك فقط.</Card>;

  function addService(svcId: string) {
    const svc = services.find((s) => s.id === svcId);
    if (!svc) return;
    setItems([...items, { service_item_id: svc.id, name: svc.name, service_type: svc.service_type, qty: 1, unit_price: Number(svc.unit_price) }]);
  }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const urgentFee = isUrgent ? Number(urgentFeeInput || 0) : 0;
  const delivery = orderType === "delivery" ? Number(deliveryFee || 0) : 0;
  const discPct = Math.max(0, Math.min(100, Number(discountPct || 0)));
  const disc = (subtotal * discPct) / 100;
  const taxable = Math.max(0, subtotal + urgentFee + delivery - disc);
  const tax = taxable * (settings.tax_percent / 100);
  const total = taxable + tax;

  async function submit() {
    if (!customer && !newCustomer.full_name) { toast.error("ابحث عن عميل أو أضف عميلاً جديداً"); return; }
    if (!items.length) { toast.error("أضف خدمة واحدة على الأقل"); return; }
    setSaving(true);

    let customerId = customer?.id;
    if (!customerId) {
      const { data, error } = await supabase.from("customers").insert({
        full_name: newCustomer.full_name, phone: newCustomer.phone, address: newCustomer.address || null,
      }).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      customerId = data!.id;
    }

    const { data: order, error: oErr } = await supabase.from("orders").insert({
      customer_id: customerId,
      order_type: orderType,
      is_urgent: isUrgent,
      payment_method: paymentMethod as any,
      payment_status: paymentStatus,
      pickup_address: orderType === "delivery" ? pickupAddress || null : null,
      delivery_address: orderType === "delivery" ? deliveryAddress || null : null,
      subtotal, urgent_fee: urgentFee, urgent_fee_amount: urgentFee, delivery_fee: delivery,
      discount_amount: disc, discount_percent: discPct, tax_amount: tax, total,
      notes: notes || null, created_by: user?.id,
    }).select("id").single();

    if (oErr) { toast.error(oErr.message); setSaving(false); return; }

    const { error: iErr } = await supabase.from("order_items").insert(
      items.map((it) => ({
        order_id: order!.id, service_item_id: it.service_item_id, name: it.name,
        service_type: it.service_type as any, qty: it.qty, unit_price: it.unit_price,
        line_total: it.qty * it.unit_price,
      }))
    );
    if (iErr) { toast.error(iErr.message); setSaving(false); return; }

    toast.success("تم إنشاء الطلب");
    nav({ to: "/orders" });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/orders"><ArrowRight className="w-4 h-4" /></Link></Button>
        <h1 className="text-2xl font-bold">طلب جديد</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">العميل</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {customer ? (
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <div className="font-medium">{customer.full_name}</div>
                <div className="text-xs text-muted-foreground">{customer.phone}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setCustomer(null); setCustomerSearch(""); }}>تغيير</Button>
            </div>
          ) : (
            <>
              <Input placeholder="ابحث بالاسم أو التليفون..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              {customerMatches.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {customerMatches.map((c) => (
                    <button key={c.id} type="button" className="w-full text-start p-2 hover:bg-muted text-sm" onClick={() => setCustomer(c)}>
                      <div className="font-medium">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground">أو أضف عميل جديد:</div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="الاسم" value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} />
                <Input placeholder="التليفون" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                <Input className="col-span-2" placeholder="العنوان (اختياري)" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">الخدمات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={addService}>
            <SelectTrigger><SelectValue placeholder="+ أضف خدمة" /></SelectTrigger>
            <SelectContent>
              {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {fmtMoney(s.unit_price)}</SelectItem>)}
            </SelectContent>
          </Select>
          {items.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">لم تتم إضافة خدمات بعد</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 rounded-lg border">
                  <div className="flex-1 font-medium text-sm">{it.name}</div>
                  <Input type="number" min={1} value={it.qty} onChange={(e) => updateItem(idx, { qty: Math.max(1, Number(e.target.value)) })} className="w-16 h-8" />
                  <Input type="number" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} className="w-24 h-8" />
                  <div className="w-24 text-end font-medium text-sm">{fmtMoney(it.qty * it.unit_price)}</div>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">التفاصيل</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>نوع الطلب</Label>
            <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">داخلي (استلام يدوي)</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>طريقة الدفع</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="instapay">InstaPay</SelectItem>
                <SelectItem value="cod_cash">دفع عند الاستلام - نقدي</SelectItem>
                <SelectItem value="cod_instapay">دفع عند الاستلام - InstaPay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {orderType === "delivery" && (
            <>
              <Input placeholder="عنوان الاستلام" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              <Input placeholder="عنوان التسليم" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              <div className="col-span-2">
                <Label>مصاريف التوصيل</Label>
                <Input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={isUrgent} onCheckedChange={(v) => setIsUrgent(!!v)} id="urgent" />
            <Label htmlFor="urgent" className="text-sm">طلب مستعجل</Label>
          </div>
          {isUrgent && (
            <div>
              <Label>رسوم الاستعجال</Label>
              <Input type="number" value={urgentFeeInput} onChange={(e) => setUrgentFeeInput(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={paymentStatus === "paid"} onCheckedChange={(v) => setPaymentStatus(v ? "paid" : "unpaid")} id="paid" />
            <Label htmlFor="paid" className="text-sm">تم الدفع</Label>
          </div>
          <div>
            <Label>نسبة الخصم %</Label>
            <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>ملاحظات</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-1 text-sm">
          <Row label="المجموع الفرعي" value={fmtMoney(subtotal)} />
          {isUrgent && <Row label="رسوم استعجال" value={fmtMoney(urgentFee)} />}
          {orderType === "delivery" && <Row label="توصيل" value={fmtMoney(delivery)} />}
          {disc > 0 && <Row label={`خصم ${discPct}%`} value={`- ${fmtMoney(disc)}`} />}
          {settings.tax_percent > 0 && <Row label={`ضريبة ${settings.tax_percent}%`} value={fmtMoney(tax)} />}
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
            <span>الإجمالي</span><span>{fmtMoney(total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link to="/orders">إلغاء</Link></Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الطلب"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="text-foreground">{value}</span></div>;
}
