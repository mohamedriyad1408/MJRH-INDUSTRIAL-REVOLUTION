import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Headphones, MessageSquare, ExternalLink, RefreshCw, Users, Clock, PhoneCall, Plus, CheckCircle2 } from "lucide-react";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney } from "@/lib/format";
import { toast } from "sonner";


function CsPickupNotebook({ tenantId, activeActor, onSuccess }: { tenantId: string; activeActor: ActiveActor | null; onSuccess: () => void }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [searching, setSearch] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [pickupSlot, setPickupSlot] = useState("اليوم 04:00 - 06:00 مساءً");
  const [saving, setSaving] = useState(false);

  async function handlePhoneChange(val: string) {
    setPhone(val);
    if (val.length >= 10 && tenantId) {
      setSearch(true);
      const { data } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).eq("phone", val).maybeSingle();
      setSearch(false);
      if (data) {
        setExistingCustomer(data);
        setFullName(data.full_name);
        setAddress(data.address || "");
        if (data.notes) setNotes(`${t("cs.notesPrefix", "[ملاحظات مسجلة]: ")}${data.notes}\n`);
      } else {
        setExistingCustomer(null);
      }
    } else {
      setExistingCustomer(null);
    }
  }

  async function registerPickup() {
    if (!phone || !fullName || !address) {
      return toast.error(t("cs.error.requiredFields", "رقم الهاتف، الاسم، والعنوان حقول مطلوبة لتسجيل الاستلام"));
    }
    setSaving(true);
    let customerId = existingCustomer?.id;
    if (!customerId) {
      const { data: newCust, error: custErr } = await supabase.from("customers").insert({
        tenant_id: tenantId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim() || null,
      }).select("id").single();
      if (custErr) {
        setSaving(false);
        return toast.error(t("cs.error.newCustomer", "خطأ في تسجيل بيانات العميل الجديد: ") + custErr.message);
      }
      customerId = newCust.id;
    }

    const { error: pickErr } = await supabase.from("pickup_requests").insert({
      tenant_id: tenantId,
      customer_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: `${t("cs.pickupTimePrefix", "موعد الاستلام: ")}${pickupSlot}${notes ? ` — ${notes}` : ""} (${t("cs.recordedBy", "سجله: ")}${activeActor?.full_name ?? t("common.خدمة_العملاء", "خدمة العملاء")})`,
      status: "pending",
    });
    setSaving(false);
    if (pickErr) {
      toast.error(t("cs.error.pickupRegister", "خطأ في تسجيل طلب الاستلام: ") + pickErr.message);
    } else {
      toast.success(t("cs.toast.pickupSuccess", "تم تسجيل طلب الاستلام للعميل في دفتر خدمة العملاء وإخطار مناديب التوصيل"));
      setPhone(""); setFullName(""); setAddress(""); setNotes(""); setExistingCustomer(null);
      onSuccess();
    }
  }

  return (
    <Card className="rounded-3xl border-2 border-indigo-500/30 shadow-md bg-gradient-to-br from-indigo-50/50 via-white to-teal-50/30 overflow-hidden">
      <CardHeader className="bg-indigo-900 text-white p-4">
        <CardTitle className="text-base font-black flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-indigo-300" />
          <span>{t("cs.notebook.title", "دفتر استلامات خدمة العملاء (CS Phone Pickup Notebook)")}</span>
        </CardTitle>
        <p className="text-xs text-indigo-100 font-medium mt-0.5">
          {t("cs.notebook.subtitle", "تسجيل طلبات استلام الملابس من العملاء المتصلين هاتفياً. يبحث النظام عن العميل القديم تلقائياً أو يسجل العميل الجديد بالنظام.")}
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 block mb-1">{t("cs.notebook.phoneLabel", "رقم الهاتف المتصل *")}</Label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={t("cs.notebook.placeholder.phone", "01xxxxxxxxx")}
                className="font-mono font-black text-sm pe-8 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 absolute start-2.5 top-2.5" />}
            </div>
            {existingCustomer ? (
              <Badge className="bg-emerald-600 text-white font-bold text-[10px] mt-1.5 w-full justify-center">{t("cs.notebook.badge.existing", "🟢 عميل قديم مسجل بالمغسلة")}</Badge>
            ) : phone.length >= 10 ? (
              <Badge className="bg-blue-600 text-white font-bold text-[10px] mt-1.5 w-full justify-center">{t("cs.notebook.badge.new", "عميل جديد (سيتم إنشاؤه آلياً)")}</Badge>
            ) : null}
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 block mb-1">{t("cs.notebook.fullNameLabel", "اسم العميل بالكامل *")}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("cs.notebook.placeholder.fullName", "اسم العميل...")}
              disabled={!!existingCustomer}
              className="font-bold text-sm bg-white rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 block mb-1">{t("cs.notebook.pickupTimeLabel", "توقيت استلام المندوب للملابس *")}</Label>
            <select
              value={pickupSlot}
              onChange={(e) => setPickupSlot(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-800 cursor-pointer"
            >
              <option value="اليوم 08:00 - 10:00 صباحاً">{t("common.اليوم_08_00___10_00_صباحاً")}</option>
              <option value="اليوم 10:00 - 12:00 ظهراً">{t("common.اليوم_10_00___12_00_ظهراً")}</option>
              <option value="اليوم 12:00 - 02:00 مساءً">{t("common.اليوم_12_00___02_00_مساءً")}</option>
              <option value="اليوم 02:00 - 04:00 مساءً">{t("common.اليوم_02_00___04_00_مساءً")}</option>
              <option value="اليوم 04:00 - 06:00 مساءً">{t("common.اليوم_04_00___06_00_مساءً")}</option>
              <option value="اليوم 06:00 - 08:00 مساءً">{t("common.اليوم_06_00___08_00_مساءً")}</option>
              <option value="اليوم 08:00 - 10:00 مساءً">{t("common.اليوم_08_00___10_00_مساءً")}</option>
              <option value="غداً 08:00 - 10:00 صباحاً">{t("common.غداً_08_00___10_00_صباحاً")}</option>
              <option value="غداً 10:00 - 12:00 ظهراً">{t("common.غداً_10_00___12_00_ظهراً")}</option>
              <option value="غداً 12:00 - 02:00 مساءً">{t("common.غداً_12_00___02_00_مساءً")}</option>
              <option value="غداً 02:00 - 04:00 مساءً">{t("common.غداً_02_00___04_00_مساءً")}</option>
              <option value="غداً 04:00 - 06:00 مساءً">{t("common.غداً_04_00___06_00_مساءً")}</option>
              <option value="غداً 06:00 - 08:00 مساءً">{t("common.غداً_06_00___08_00_مساءً")}</option>
              <option value="غداً 08:00 - 10:00 مساءً">{t("common.غداً_08_00___10_00_مساءً")}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 block mb-1">{t("cs.notebook.addressLabel", "عنوان الاستلام بالتفصيل *")}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("cs.notebook.placeholder.address", "المنطقة، الشارع، رقم العمارة والدور...")}
              className="font-medium text-xs bg-white rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 block mb-1">{t("cs.notebook.notesLabel", "ملاحظات وتعليمات الاستلام")}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("cs.notebook.placeholder.notes", "مثال: الاتصال قبل الوصول بـ 10 دقائق، الغسيل في البواب...")}
              className="font-medium text-xs bg-white rounded-xl"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button
            onClick={registerPickup}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-black rounded-xl px-6 h-11 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Plus className="w-4 h-4 ms-1" />}
            <span>{t("cs.notebook.btnRegister", "تسجيل طلب الاستلام في الدفتر وتوجيه المندوب")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CSStation() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [oRes, pRes] = await Promise.all([
      supabase.from("orders").select("id,order_number,status,total,created_at,notes,customers(full_name,phone)").eq("tenant_id", tenantId).not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(15),
      supabase.from("pickup_requests").select("*").eq("tenant_id", tenantId).in("status", ["pending", "assigned"]).order("created_at", { ascending: false }).limit(10),
    ]);
    setOrders(oRes.data ?? []);
    setPickups(pRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="space-y-5" dir={dir}>
      <StationActorWidget stationId="cs" stationLabel={t("cs.station.label", "خدمة العملاء والدعم والمتابعة")} onActorChange={setActiveActor} />

      <div className="rounded-3xl bg-gradient-to-br from-indigo-800 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Headphones className="w-7 h-7 text-indigo-300" /> {t("cs.station.title", "محطة خدمة العملاء والدعم والمتابعة")}</h1>
            <p className="text-sm text-white/70 mt-1">{t("cs.station.subtitle", "الرد على استفسارات العملاء، متابعة طلبات الاستلام، وتنسيق الإشعارات والدعم الفني.")}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20"><Link to={"/$tenant/customer-care" as any}><MessageSquare className="w-4 h-4 ms-1" /> {t("common.لوحة_خدمة_العملاء", "واتساب والدعم الشامل")}</Link></Button>
            <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 ms-1" /> {t("common.تحديث", "تحديث")}</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">{t("cs.stats.activeOrders", "الطلبات الجارية للمتابعة")}</div><div className="text-xl font-black">{orders.length} {t("common.طلب", "طلب")}</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">{t("cs.stats.pendingPickups", "استلامات بانتظار المندوب")}</div><div className="text-xl font-black text-amber-300">{pickups.length} {t("common.استلام", "استلام")}</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">{t("cs.stats.supportLine", "حالة خط الدعم")}</div><div className="text-sm font-black text-emerald-300 mt-1">{t("cs.stats.online", "🟢 متصل ونشط")}</div></div>
        </div>
      </div>

      {tenantId && <CsPickupNotebook tenantId={tenantId} activeActor={activeActor} onSuccess={load} />}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="rounded-3xl shadow-sm border">
            <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600" /> {t("cs.station.activePickupsTitle", "طلبات الاستلام النشطة (Active Pickups)")}</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              {pickups.length === 0 ? <p className="text-center text-xs text-slate-400 py-6 font-bold">{t("cs.noPendingPickups", "لا توجد طلبات استلام معلقة حالياً")}</p> : pickups.map((p) => (
                <div key={p.id} className="p-3 rounded-2xl border bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{p.customer_name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{p.phone} — {p.address}</div>
                    {p.notes && <div className="text-[11px] text-indigo-700 mt-1 font-medium">{p.notes}</div>}
                  </div>
                  <Badge className={p.status === "pending" ? "bg-amber-500 text-white font-bold" : "bg-blue-600 text-white font-bold"}>{p.status === "pending" ? t("common.بانتظار_مندوب", "بانتظار مندوب") : t("common.مندوب_في_الطريق", "مندوب في الطريق")}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm border">
            <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" /> {t("cs.station.recentOrdersTitle", "أحدث الطلبات ومسار العملاء")}</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              {orders.length === 0 ? <p className="text-center text-xs text-slate-400 py-6 font-bold">{t("cs.noOrders", "لا توجد طلبات معلقة")}</p> : orders.map((o) => (
                <div key={o.id} className="p-3 rounded-2xl border bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{t("common.طلب", "طلب")} #{o.order_number} — {o.customers?.full_name ?? t("common.عميل", "عميل")}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{fmtDate(o.created_at)} · {fmtMoney(o.total)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-black text-[10px]">{o.status}</Badge>
                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl"><Link to={"/$tenant/orders/$id" as any} params={{ id: o.id } as any}><ExternalLink className="w-4 h-4" /></Link></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
