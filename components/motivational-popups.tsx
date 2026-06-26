import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy } from "lucide-react";

const GENERAL = [
  "كل قطعة بتخلصها بدقة بتبني ثقة عميل جديد 💪",
  "شغلك النهارده هو سمعة المكان بكرة ✨",
  "النظام معاك عشان يسهّل عليك، ركّز في الجودة والباقي علينا 🚀",
  "خطوة منظمة صغيرة توفر تعب كبير في آخر اليوم 🌟",
];
const BY_STATION: Record<string, string[]> = {
  reception: ["استقبالك الحلو هو أول انطباع للعميل 😊", "طلب واضح من البداية يعني تشغيل أسهل للنهاية ✅"],
  cleaning: ["الغسيل المتقن هو قلب الجودة 🫧", "راجع الملاحظات قبل البداية، التفاصيل بتفرق ✨"],
  ironing: ["الكي المتقن بيخلي القطعة تتكلم عن شغلك 👔", "كل قميص مظبوط = عميل راجع تاني 🌟"],
  packing: ["التغليف آخر لمسة في تجربة العميل 🎁", "راجع الكود والقطعة قبل التسليم، الدقة تكسبنا ثقة ✅"],
  driver: ["تسليمك في المعاد هو وعد بنحافظ عليه 🚗", "ابتسامتك وقت التسليم جزء من الخدمة 😊"],
};

function isMobile() { return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches; }

export function MotivationalPopups() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState<string | null>(null);
  const [message, setMessage] = useState(GENERAL[0]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("employees").select("station,job_role,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(({ data }: any) => {
      setStation(data?.job_role === "driver" ? "driver" : data?.station ?? null);
    });
  }, [user]);

  const messages = useMemo(() => [...(station && BY_STATION[station] ? BY_STATION[station] : []), ...GENERAL], [station]);

  useEffect(() => {
    if (!user) return;
    const key = `mjrh_motivation_${user.id}`;
    const show = () => {
      const last = Number(localStorage.getItem(key) || 0);
      const due = Date.now() - last > 20 * 60 * 1000;
      if (due || isMobile()) {
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
        setOpen(true);
        localStorage.setItem(key, String(Date.now()));
      }
    };
    const t0 = setTimeout(show, isMobile() ? 1200 : 5000);
    const interval = setInterval(show, 20 * 60 * 1000);
    return () => { clearTimeout(t0); clearInterval(interval); };
  }, [user, messages]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent dir="rtl" className="max-w-sm border-0 bg-gradient-to-br from-violet-700 via-slate-900 to-teal-800 text-white shadow-2xl rounded-3xl overflow-hidden">
      <div className="absolute -top-16 -left-16 w-36 h-36 bg-teal-300/30 rounded-full blur-2xl" />
      <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-300/20 rounded-full blur-2xl" />
      <div className="relative space-y-4 text-center py-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center"><Trophy className="w-7 h-7 text-amber-300" /></div>
        <div className="font-black text-xl flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-teal-200" />رسالة تشجيع</div>
        <p className="text-lg font-bold leading-8 text-white/95">{message}</p>
        <Button onClick={() => setOpen(false)} className="bg-teal-300 hover:bg-teal-200 text-slate-950 font-black rounded-2xl">يلا نكمل شغل 💪</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
