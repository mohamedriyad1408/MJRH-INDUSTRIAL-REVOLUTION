import { createLazyFileRoute } from "@tanstack/react-router";
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
import { useI18n } from "@/lib/i18n";

export const Route = createLazyFileRoute("/_app/crm")({
  component: CrmPage,
});

const templates: Record<string, string> = {
  order_ready: "طلب حضرتك جاهز للاستلام/التسليم. شكرًا لاختيارك مغسلتنا.",
  payment_reminder: "تذكير بسداد قيمة الطلب قبل التسليم. لو محتاج مساعدة كلمنا.",
  winback: "وحشتنا! عندك خصم خاص على الطلب القادم لمدة 7 أيام.",
  thanks: "شكرًا لثقتك فينا. رأيك يهمنا لتحسين الخدمة.",
};

function CrmPage() {
  const { t, dir } = useI18n();
  const { hasRole, user } = useAuth();
  const canUse = hasRole("owner", "cs_manager", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ customer_id: "", template_key: "order_ready", message: templates.order_ready });

  async function load() {
    setLoading(true);
    const [cRes, lRes, mRes] = await Promise.all([
      supabase.from("customers").select("id,full_name,phone,created_at").order("created_at", { ascending: false }).limit(300),
      (supabase.from("customer_loyalty").select("*,customers(full_name,phone)").order("points", { ascending: false }).limit(100) as Promise<any>).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase.from("customer_messages").select("*,customers(full_name,phone)").order("created_at", { ascending: false }).limit(60) as Promise<any>).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    setCustomers(cRes.data ?? []); setLoyalty(lRes.data ?? []); setMessages(mRes.data ?? []); setLoading(false);
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);

  const stats = useMemo(() => {
    const vip = loyalty.filter((x: any) => x.tier === "vip" || x.tier === "gold").length;
    const points = loyalty.reduce((s: number, x: any) => s + Number(x.points ?? 0), 0);
    const queued = messages.filter((x: any) => x.status === "queued" || x.status === "draft").length;
    return { vip, points, queued };
  }, [loyalty, messages]);

  async function rebuildLoyalty() {
    const { data: orders, error } = await supabase.from("orders").select("customer_id,total,created_at,status").neq("status", "cancelled");
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
    if (!rows.length) return toast.info(t("crm.err.noOrders", "لا توجد طلبات لحساب الولاء"));
    const { error: upErr } = await supabase.from("customer_loyalty").upsert(rows, { onConflict: "tenant_id,customer_id" });
    if (upErr) toast.error(upErr.message); else { toast.success(t("crm.toast.loyaltyUpdated", "تم تحديث نقاط الولاء")); load(); }
  }

  function selectTemplate(key: string) { setForm({ ...form, template_key: key, message: templates[key] }); }

  async function saveMessage(status: "draft" | "queued") {
    const c = customers.find((x: any) => x.id === form.customer_id);
    if (!c) return toast.error(t("crm.err.selectClient", "اختار عميل"));
    if (!form.message.trim()) return toast.error(t("crm.err.writeMsg", "اكتب الرسالة"));
    const messageText = form.message;
    const { error } = await supabase.from("customer_messages").insert({
      customer_id: c.id, phone: c.phone, channel: "whatsapp", template_key: form.template_key, message: messageText, status, created_by: user?.id,
    });
    if (error) toast.error(error.message); else {
      if (status === "queued") {
        window.open(whatsappUrl(c.phone, messageText), "_blank", "noopener,noreferrer");
        toast.success(t("crm.toast.waOpened", "تم فتح واتساب. بعد الإرسال اضغط: تم الإرسال من سجل الرسائل"));
      } else {
        toast.success(t("crm.toast.draftSaved", "تم حفظ مسودة"));
      }
      setForm({ customer_id: "", template_key: "order_ready", message: templates.order_ready });
      load();
    }
  }

  async function markSent(m: any) {
    const { error } = await supabase.from("customer_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", m.id);
    if (error) toast.error(error.message); else { toast.success(t("crm.toast.msgSent", "تم تعليم الرسالة كمرسلة")); load(); }
  }

  function whatsappUrl(phone: string, msg: string) {
    const p = (phone || "").replace(/\D/g, "");
    return `https://wa.me/${p.startsWith("2") ? p : "2" + p}?text=${encodeURIComponent(msg)}`;
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("crm.err.access", "CRM متاح للمالك وخدمة العملاء والتشغيل فقط.")}</CardContent></Card>;

  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><HeartHandshake className="w-7 h-7 text-teal-600" />{t("crm.pageTitle", "CRM والولاء والواتساب")}</h1><p className="text-sm text-muted-foreground">{t("crm.subtitle", "نقاط العملاء، شرائح VIP، وتحضير رسائل واتساب. الإرسال الحالي يفتح واتساب يدويًا، والإرسال الآلي يحتاج WhatsApp API.")}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button onClick={rebuildLoyalty}><RefreshCw className="w-4 h-4 ms-1" />{t("crm.syncLoyalty", "تحديث الولاء")}</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi label={t("crm.kpi.customers", "عملاء")} value={customers.length} />
      <Kpi label={t("crm.kpi.vip", "Gold/VIP")} value={stats.vip} />
      <Kpi label={t("crm.kpi.queued", "رسائل جاهزة للإرسال")} value={stats.queued} />
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="loyalty" className="space-y-4">
      <TabsList><TabsTrigger value="loyalty">{t("crm.tab.loyalty", "الولاء")}</TabsTrigger><TabsTrigger value="messages">{t("crm.tab.messages", "الرسائل")}</TabsTrigger></TabsList>
      <TabsContent value="loyalty">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />{t("crm.loyalty.title", "أفضل العملاء")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loyalty.map((l: any) => <div key={l.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><div className="font-black">{l.customers?.full_name ?? t("stations.common.customer")}</div><Badge>{tierAr(l.tier, t)}</Badge></div><div className="text-xs text-muted-foreground mt-1">{l.customers?.phone}</div><div className="grid grid-cols-2 gap-2 mt-3 text-sm"><div className="rounded-xl bg-teal-50 p-2"><div className="text-xs text-teal-700">{t("crm.loyalty.points", "النقاط")}</div><b>{l.points}</b></div><div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">{t("crm.loyalty.spend", "إجمالي الشراء")}</div><b>{fmtMoney(l.lifetime_spend, curr)}</b></div></div></div>)}
          {!loyalty.length && <div className="col-span-full text-center text-muted-foreground p-10">{t("crm.loyalty.empty", "اضغط “تحديث الولاء” لبناء نقاط العملاء من الطلبات.")}</div>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="messages" className="grid lg:grid-cols-[380px_1fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-600" />{t("crm.msg.title", "رسالة واتساب")}</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label={t("crm.msg.client", "العميل")}><Select value={form.customer_id} onValueChange={(v: any) => setForm({ ...form, customer_id: v })}><SelectTrigger><SelectValue placeholder={t("crm.msg.clientPlaceholder", "اختار عميل")} /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={t("crm.msg.template", "القالب")}><Select value={form.template_key} onValueChange={selectTemplate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="order_ready">{t("crm.msg.tplOrderReady", "الطلب جاهز")}</SelectItem><SelectItem value="payment_reminder">{t("crm.msg.tplPaymentReminder", "تذكير دفع")}</SelectItem><SelectItem value="winback">{t("crm.msg.tplWinback", "استرجاع عميل")}</SelectItem><SelectItem value="thanks">{t("crm.msg.tplThanks", "شكر وتقييم")}</SelectItem></SelectContent></Select></Field>
          <Field label={t("crm.msg.body", "نص الرسالة")}><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => saveMessage("draft")}>{t("crm.msg.draftBtn", "مسودة")}</Button><Button onClick={() => saveMessage("queued")}><Send className="w-4 h-4 ms-1" />{t("crm.msg.sendBtn", "فتح واتساب للإرسال")}</Button></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("crm.log.title", "سجل الرسائل")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {messages.map((m: any) => <div key={m.id} className="rounded-2xl border p-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{m.customers?.full_name ?? m.phone}</div><Badge variant={m.status === "sent" ? "secondary" : "outline"}>{statusAr(m.status, t)}</Badge></div><p className="text-sm text-muted-foreground">{m.message}</p><div className="flex gap-2"><Button size="sm" variant="outline" asChild><a href={whatsappUrl(m.phone ?? m.customers?.phone, m.message)} target="_blank">{t("crm.log.openWa", "فتح واتساب")}</a></Button>{m.status !== "sent" && <Button size="sm" onClick={() => markSent(m)}>{t("crm.log.markSent", "تم الإرسال")}</Button>}</div></div>)}
          {!messages.length && <div className="text-center text-muted-foreground p-10">{t("crm.log.empty", "لا توجد رسائل بعد")}</div>}
        </CardContent></Card>
      </TabsContent>
    </Tabs>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: any }) { return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function tierAr(s: string, t: any) { return ({ basic: t("crm.tier.basic", "Basic"), silver: t("crm.tier.silver", "Silver"), gold: t("crm.tier.gold", "Gold"), vip: t("crm.tier.vip", "VIP") } as any)[s] ?? s; }
function statusAr(s: string, t: any) { return ({ draft: t("crm.status.draft", "مسودة"), queued: t("crm.status.queued", "جاهزة للإرسال"), sent: t("crm.status.sent", "مرسلة"), failed: t("crm.status.failed", "فشلت") } as any)[s] ?? s; }
