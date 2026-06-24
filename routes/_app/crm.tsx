import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { HeartHandshake, MessageCircle, Star, Loader2, RefreshCw, Send } from "lucide-react";

export const Route = createFileRoute("/_app/crm")({
  head: () => ({ meta: [{ title: "CRM والولاء" }] }),
  component: CrmPage,
});

const templates: Record<string, string> = {
  order_ready: "طلب حضرتك جاهز للاستلام/التسليم. شكرًا لاختيارك مغسلتنا.",
  payment_reminder: "تذكير بسداد قيمة الطلب قبل التسليم. لو محتاج مساعدة كلمنا.",
  winback: "وحشتنا! عندك خصم خاص على الطلب القادم لمدة 7 أيام.",
  thanks: "شكرًا لثقتك فينا. رأيك يهمنا لتحسين الخدمة.",
};

function CrmPage() {
  const { hasRole, user } = useAuth();
  const canUse = hasRole("owner", "cs_manager", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ customer_id: "", template_key: "order_ready", message: templates.order_ready });

  async function load() {
    setLoading(true);
    const [c, l, m] = await Promise.all([
      (supabase as any).from("customers").select("id,full_name,phone,created_at").order("created_at", { ascending: false }).limit(300),
      (supabase as any).from("customer_loyalty").select("*,customers(full_name,phone)").order("points", { ascending: false }).limit(100).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("customer_messages").select("*,customers(full_name,phone)").order("created_at", { ascending: false }).limit(60).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    if (c.error) toast.error(c.error.message);
    setCustomers(c.data ?? []); setLoyalty(l.data ?? []); setMessages(m.data ?? []); setLoading(false);
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);

  const stats = useMemo(() => {
    const vip = loyalty.filter((x) => x.tier === "vip" || x.tier === "gold").length;
    const points = loyalty.reduce((s, x) => s + Number(x.points ?? 0), 0);
    const queued = messages.filter((x) => x.status === "queued" || x.status === "draft").length;
    return { vip, points, queued };
  }, [loyalty, messages]);

  async function rebuildLoyalty() {
    const { data: orders, error } = await (supabase as any).from("orders").select("customer_id,total,created_at,status").neq("status", "cancelled");
    if (error) return toast.error(error.message);
    const map = new Map<string, { spend: number; last: string | null }>();
    (orders ?? []).forEach((o: any) => {
      const row = map.get(o.customer_id) ?? { spend: 0, last: null };
      row.spend += Number(o.total ?? 0);
      if (!row.last || new Date(o.created_at) > new Date(row.last)) row.last = o.created_at;
      map.set(o.customer_id, row);
    });
    const rows = Array.from(map.entries()).map(([customer_id, v]) => {
      const points = Math.floor(v.spend / 10);
      const tier = v.spend >= 20000 ? "vip" : v.spend >= 10000 ? "gold" : v.spend >= 5000 ? "silver" : "basic";
      return { customer_id, lifetime_spend: v.spend, points, tier, last_order_at: v.last };
    });
    if (!rows.length) return toast.info("لا توجد طلبات لحساب الولاء");
    const { error: upErr } = await (supabase as any).from("customer_loyalty").upsert(rows, { onConflict: "tenant_id,customer_id" });
    if (upErr) toast.error(upErr.message); else { toast.success("تم تحديث نقاط الولاء"); load(); }
  }

  function selectTemplate(key: string) { setForm({ ...form, template_key: key, message: templates[key] }); }

  async function saveMessage(status: "draft" | "queued") {
    const c = customers.find((x) => x.id === form.customer_id);
    if (!c) return toast.error("اختار عميل");
    if (!form.message.trim()) return toast.error("اكتب الرسالة");
    const { error } = await (supabase as any).from("customer_messages").insert({
      customer_id: c.id, phone: c.phone, channel: "whatsapp", template_key: form.template_key, message: form.message, status, created_by: user?.id,
    });
    if (error) toast.error(error.message); else { toast.success(status === "queued" ? "تم وضع الرسالة في قائمة الإرسال" : "تم حفظ مسودة"); setForm({ customer_id: "", template_key: "order_ready", message: templates.order_ready }); load(); }
  }

  async function markSent(m: any) {
    const { error } = await (supabase as any).from("customer_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", m.id);
    if (error) toast.error(error.message); else { toast.success("تم تعليم الرسالة كمرسلة"); load(); }
  }

  function whatsappUrl(phone: string, msg: string) {
    const p = (phone || "").replace(/\D/g, "");
    return `https://wa.me/${p.startsWith("2") ? p : "2" + p}?text=${encodeURIComponent(msg)}`;
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">CRM متاح للمالك وخدمة العملاء والتشغيل فقط.</CardContent></Card>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><HeartHandshake className="w-7 h-7 text-teal-600" />CRM والولاء والواتساب</h1><p className="text-sm text-muted-foreground">نقاط العملاء، شرائح VIP، وتحضير رسائل واتساب قابلة للإرسال.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button onClick={rebuildLoyalty}><RefreshCw className="w-4 h-4 ms-1" />تحديث الولاء</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi label="عملاء" value={customers.length} />
      <Kpi label="Gold/VIP" value={stats.vip} />
      <Kpi label="رسائل معلقة" value={stats.queued} />
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="loyalty" className="space-y-4">
      <TabsList><TabsTrigger value="loyalty">الولاء</TabsTrigger><TabsTrigger value="messages">الرسائل</TabsTrigger></TabsList>
      <TabsContent value="loyalty">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />أفضل العملاء</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loyalty.map((l) => <div key={l.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><div className="font-black">{l.customers?.full_name ?? "عميل"}</div><Badge>{tierAr(l.tier)}</Badge></div><div className="text-xs text-muted-foreground mt-1">{l.customers?.phone}</div><div className="grid grid-cols-2 gap-2 mt-3 text-sm"><div className="rounded-xl bg-teal-50 p-2"><div className="text-xs text-teal-700">النقاط</div><b>{l.points}</b></div><div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">إجمالي الشراء</div><b>{fmtMoney(l.lifetime_spend)}</b></div></div></div>)}
          {!loyalty.length && <div className="col-span-full text-center text-muted-foreground p-10">اضغط “تحديث الولاء” لبناء نقاط العملاء من الطلبات.</div>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="messages" className="grid lg:grid-cols-[380px_1fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-600" />رسالة واتساب</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label="العميل"><Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}><SelectTrigger><SelectValue placeholder="اختار عميل" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="القالب"><Select value={form.template_key} onValueChange={selectTemplate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="order_ready">الطلب جاهز</SelectItem><SelectItem value="payment_reminder">تذكير دفع</SelectItem><SelectItem value="winback">استرجاع عميل</SelectItem><SelectItem value="thanks">شكر وتقييم</SelectItem></SelectContent></Select></Field>
          <Field label="نص الرسالة"><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => saveMessage("draft")}>مسودة</Button><Button onClick={() => saveMessage("queued")}><Send className="w-4 h-4 ms-1" />تجهيز للإرسال</Button></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">سجل الرسائل</CardTitle></CardHeader><CardContent className="space-y-2">
          {messages.map((m) => <div key={m.id} className="rounded-2xl border p-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{m.customers?.full_name ?? m.phone}</div><Badge variant={m.status === "sent" ? "secondary" : "outline"}>{statusAr(m.status)}</Badge></div><p className="text-sm text-muted-foreground">{m.message}</p><div className="flex gap-2"><Button size="sm" variant="outline" asChild><a href={whatsappUrl(m.phone ?? m.customers?.phone, m.message)} target="_blank">فتح واتساب</a></Button>{m.status !== "sent" && <Button size="sm" onClick={() => markSent(m)}>تم الإرسال</Button>}</div></div>)}
          {!messages.length && <div className="text-center text-muted-foreground p-10">لا توجد رسائل بعد</div>}
        </CardContent></Card>
      </TabsContent>
    </Tabs>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: any }) { return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function tierAr(s: string) { return ({ basic: "Basic", silver: "Silver", gold: "Gold", vip: "VIP" } as any)[s] ?? s; }
function statusAr(s: string) { return ({ draft: "مسودة", queued: "جاهزة", sent: "مرسلة", failed: "فشلت" } as any)[s] ?? s; }
