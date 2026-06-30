import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GENERAL_LANGS: Record<string, string[]> = {
  ar: [
    "كل قطعة بتخلصها بدقة بتبني ثقة عميل جديد 💪",
    "شغلك النهارده هو سمعة المكان بكرة ✨",
    "النظام معاك عشان يسهّل عليك، ركّز في الجودة والباقي علينا 🚀",
    "خطوة منظمة صغيرة توفر تعب كبير في آخر اليوم 🌟",
  ],
  en: [
    "Every piece you finish with precision builds trust with a new customer 💪",
    "Your work today is the reputation of the place tomorrow ✨",
    "The system is here to make it easier for you. Focus on quality, we handle the rest 🚀",
    "A small organized step saves a lot of exhaustion at the end of the day 🌟",
  ],
  it: [
    "Ogni pezzo che finisci con precisione costruisce la fiducia con un nuovo cliente 💪",
    "Il tuo lavoro oggi è la reputazione del posto domani ✨",
    "Il sistema è qui per semplificarti le cose. Concentrati sulla qualità, al resto pensiamo noi 🚀",
    "Un piccolo passo organizzato risparmia molta fatica alla fine della giornata 🌟",
  ],
  fr: [
    "Chaque pièce finie avec précision renforce la confiance du client 💪",
    "Votre travail aujourd'hui fait la réputation de demain ✨",
    "Le système est là pour vous faciliter la tâche. Concentrez-vous sur la qualité ! 🚀",
    "Une petite étape organisée évite bien de la fatigue en fin de journée 🌟",
  ],
  es: [
    "Cada prenda terminada con precisión construye la confianza con un nuevo cliente 💪",
    "Tu trabajo hoy es la reputación del lugar mañana ✨",
    "El sistema está aquí para facilitarte las cosas. Concéntrate en la calidad 🚀",
    "Un pequeño paso organizado ahorra mucho cansancio al final del día 🌟",
  ],
  de: [
    "Jedes präzise bearbeitete Teil baut Vertrauen bei einem neuen Kunden auf 💪",
    "Ihre Arbeit heute ist der Ruf von morgen ✨",
    "Das System ist da, um es Ihnen einfacher zu machen. Konzentrieren Sie sich auf Qualität 🚀",
    "Ein kleiner organisierter Schritt spart am Ende des Tages viel Erschöpfung 🌟",
  ],
  zh: [
    "您精益求精处理的每一件衣物，都在建立新客户对我们的信任 💪",
    "您今天的辛勤工作，就是我们明天良好的口碑与声誉 ✨",
    "系统的存在是为了让您的工作更轻松，专注于品质，剩下的交给我们 🚀",
    "日间一小步井井有条的整理，能省去日终结算时的许多疲惫 🌟",
  ],
  ja: [
    "あなたが丁寧に仕上げるすべての商品は、新しいお客様との信頼を築きます 💪",
    "今日のあなたの仕事が、明日のこのお店の評判になります ✨",
    "システムはあなたの業務を簡単にするためにあります。品質に集中してください 🚀",
    "日中の整理整頓の小さな一歩が、一日の終わりの大きな疲労を軽減します 🌟",
  ],
  pt: [
    "Cada peça finalizada com precisão constrói confiança com um novo cliente 💪",
    "O seu trabalho hoje é a reputação do lugar amanhã ✨",
    "O sistema está aqui para facilitar sua vida. Foque na qualidade, cuidamos do resto 🚀",
    "Um pequeno passo organizado poupa muito cansaço no fim do dia 🌟",
  ]
};

const BY_STATION_LANGS: Record<string, Record<string, string[]>> = {
  ar: {
    reception: ["استقبالك الحلو هو أول انطباع للعميل 😊", "طلب واضح من البداية يعني تشغيل أسهل للنهاية ✅"],
    cleaning: ["الغسيل المتقن هو قلب الجودة 🫧", "راجع الملاحظات قبل البداية، التفاصيل بتفرق ✨"],
    ironing: ["الكي المتقن بيخلي القطعة تتكلم عن شغلك 👔", "كل قميص مظبوط = عميل راجع تاني 🌟"],
    packing: ["التغليف آخر لمسة في تجربة العميل 🎁", "راجع الكود والقطعة قبل التسليم، الدقة تكسبنا ثقة ✅"],
    driver: ["تسليمك في المعاد هو وعد بنحافظ عليه 🚗", "ابتسامتك وقت التسليم جزء من الخدمة 😊"],
  },
  en: {
    reception: ["Your warm welcome is the customer's first impression 😊", "A clear order at start means easier processing at the end ✅"],
    cleaning: ["Perfect washing is the heart of quality 🫧", "Review notes before starting, details matter ✨"],
    ironing: ["Perfect ironing makes the piece speak for your work 👔", "Every perfect shirt = a returning customer 🌟"],
    packing: ["Packing is the final touch in the customer's experience 🎁", "Check code and piece before delivery, accuracy wins trust ✅"],
    driver: ["On-time delivery is a promise we keep 🚗", "Your smile during delivery is part of the service 😊"],
  },
  it: {
    reception: ["La tua calda accoglienza è la prima impressione per il cliente 😊", "Un ordine chiaro all'inizio significa un'elaborazione più semplice alla fine ✅"],
    cleaning: ["Un lavaggio perfetto è il cuore della qualità 🫧", "Rivedi le note prima di iniziare, i dettagli contano ✨"],
    ironing: ["Una stiratura perfetta fa parlare il capo del tuo lavoro 👔", "Ogni camicia perfetta = un cliente che ritorna 🌟"],
    packing: ["L'imballaggio è il tocco finale nell'esperienza del cliente 🎁", "Verifica il codice e il capo prima della consegna, l'accuratezza vince la fiducia ✅"],
    driver: ["La consegna puntuale è una promessa che manteniamo 🚗", "Il tuo sorriso durante la consegna fa parte del servizio 😊"],
  },
  fr: {
    reception: ["Votre accueil chaleureux est la première impression du client 😊", "Une commande claire au début signifie un traitement plus simple à la fin ✅"],
    cleaning: ["Un lavage parfait est le cœur de la qualité 🫧", "Lisez les notes avant de commencer, les détails comptent ✨"],
    ironing: ["Un repassage parfait fait parler le vêtement de votre travail 👔", "Chaque chemise parfaite = un client qui revient 🌟"],
    packing: ["L'emballage est la touche finale de l'expérience client 🎁", "Vérifiez le code et l'article avant livraison, la précision gagne la confiance ✅"],
    driver: ["La livraison à temps est une promesse tenue 🚗", "Votre sourire lors de la livraison fait partie du service 😊"],
  },
  es: {
    reception: ["Tu cálida bienvenida es la primera impresión del cliente 😊", "Un pedido claro al inicio significa un procesamiento más fácil al final ✅"],
    cleaning: ["El lavado perfecto es el corazón de la calidad 🫧", "Revisa las notas antes de comenzar, los detalles importan ✨"],
    ironing: ["El planchado perfecto hace que la prenda hable de tu trabajo 👔", "Cada camisa perfecta = un cliente que regresa 🌟"],
    packing: ["El empaque es el toque final en la experiencia del cliente 🎁", "Verifica el código y la prenda antes de la entrega, la precisión gana confianza ✅"],
    driver: ["La entrega a tiempo es una promesa que mantenemos 🚗", "Tu sonrisa durante la entrega es parte del servicio 😊"],
  },
  de: {
    reception: ["Ihr herzlicher Empfang ist der erste Eindruck des Kunden 😊", "Ein klarer Auftrag zu Beginn bedeutet eine einfachere Bearbeitung am Ende ✅"],
    cleaning: ["Perfektes Waschen ist das Herzstück der Qualität 🫧", "Überprüfen Sie die Notizen vor dem Start, Details zählen ✨"],
    ironing: ["Perfektes Bügeln lässt das Stück für Ihre Arbeit sprechen 👔", "Jedes perfekte Hemd = ein wiederkehrender Kunde 🌟"],
    packing: ["Die Verpackung ist der letzte Schliff im Kundenerlebnis 🎁", "Überprüfen Sie Code und Stück vor der Auslieferung, Genauigkeit gewinnt Vertrauen ✅"],
    driver: ["Pünktliche Lieferung ist ein Versprechen, das wir halten 🚗", "Ihr Lächeln bei der Lieferung ist Teil des Service 😊"],
  },
  zh: {
    reception: ["您热情周到的接待，是客户对店面的第一印象 😊", "起点的登记清晰明了，意味着终点的工位处理顺畅 ✅"],
    cleaning: ["无瑕疵的净洗是服务质量的核心 🫧", "洗涤前请仔细核对特别要求，细节决定品质 ✨"],
    ironing: ["平整如新的熨烫，是展现您专业水准的最佳名片 👔", "每一件完美平整的衣物，都是争取回头客的黄金契机 🌟"],
    packing: ["精致完美的包装，是呈献给客户最棒的视觉体验 🎁", "交付前仔细核对物料和条码，严谨赢得信任 ✅"],
    driver: ["准时安全地将衣物送达，是我们对客户始终如一的承诺 🚗", "派送时真诚微笑的瞬间，也是优质服务不可或缺的一部分 😊"],
  },
  ja: {
    reception: ["温かい歓迎はお客様の第一印象です 😊", "最初の明確な注文は、最後の処理を容易にします ✅"],
    cleaning: ["完璧な洗浄は品質の核心です 🫧", "開始前にメモを確認してください。ディテールが重要です ✨"],
    ironing: ["完璧なアイロンがけは、あなたの仕事ぶりを証明します 👔", "すべての完璧なシャツ = リピーターのお客様 🌟"],
    packing: ["梱包はお客様の体験の仕上げです 🎁", "配送前にコードと商品を確認してください。正確さが信頼を勝ち取ります ✅"],
    driver: ["時間通りの配達は私たちが守る約束です 🚗", "配達時の笑顔もサービスの一部です 😊"],
  },
  pt: {
    reception: ["Sua recepção calorosa é a primeira impressão do cliente 😊", "Um pedido claro no início significa um processamento mais fácil no fim ✅"],
    cleaning: ["Uma lavagem perfeita é o coração da qualidade 🫧", "Revise as notas antes de começar, os detalhes importan ✨"],
    ironing: ["Uma passadoria perfeita faz a peça falar pelo seu trabalho 👔", "Cada camisa perfeita = um cliente que retorna 🌟"],
    packing: ["A embalagem é o toque final na experiência do cliente 🎁", "Verifique o código e a peça antes da entrega, a precisão ganha confiança ✅"],
    driver: ["A entrega no prazo é uma promessa que mantemos 🚗", "Seu sorriso na entrega é parte do serviço 😊"],
  }
};

function isMobile() { return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches; }

export function MotivationalPopups() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState<string | null>(null);

  const lang = (SUPPORTED_LANGS_KEYS.includes(language) ? language : "en") as string;
  const general = GENERAL_LANGS[lang] ?? GENERAL_LANGS.en;
  const stationMessages = (station && BY_STATION_LANGS[lang]?.[station]) ? BY_STATION_LANGS[lang][station] : [];
  const messages = useMemo(() => [...stationMessages, ...general], [stationMessages, general]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (messages.length && !message) setMessage(messages[0]);
  }, [messages, message]);

  useEffect(() => {
    if (!user) return;
    supabase.from("employees").select("station,job_role,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(({ data }: any) => {
      setStation(data?.job_role === "driver" ? "driver" : data?.station ?? null);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !messages.length || typeof window === "undefined") return;
    const muteKey = `mjrh_motivation_${user.id}`;
    const mutedUntil = Number(localStorage.getItem(muteKey) || 0);
    if (Date.now() < mutedUntil) return;

    // 1. Initial Session Check: Shows when user first opens/returns to app after closing tab/reloading
    const sessionKey = `mjrh_session_motivate_${user.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      const t0 = setTimeout(() => {
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
        setOpen(true);
        sessionStorage.setItem(sessionKey, "active");
      }, 1500);
      return () => clearTimeout(t0);
    }

    // 2. Idle Screensaver Timer: Shows after 20 minutes of no user interaction
    let lastActivity = Date.now();
    const IDLE_THRESHOLD = 20 * 60 * 1000; // 20 minutes

    const onActivity = () => {
      lastActivity = Date.now();
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_THRESHOLD) {
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
        setOpen(true);
        lastActivity = Date.now(); // Reset so it doesn't immediately re-trigger
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
    };
  }, [user, messages]);

  if (!dataExists(messages, message)) return null;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-sm border-0 bg-gradient-to-br from-violet-700 via-slate-900 to-teal-800 text-white shadow-2xl rounded-3xl overflow-hidden">
      <div className="absolute -top-16 -left-16 w-36 h-36 bg-teal-300/30 rounded-full blur-2xl" />
      <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-300/20 rounded-full blur-2xl" />
      <div className="relative space-y-4 text-center py-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center"><Trophy className="w-7 h-7 text-amber-300" /></div>
        <div className="font-black text-xl flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-teal-200" />{t("motivate.title")}</div>
        <p className="text-lg font-bold leading-8 text-white/95">{message}</p>
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={() => setOpen(false)} className="flex-1 bg-teal-300 hover:bg-teal-200 text-slate-950 font-black rounded-2xl">{t("motivate.button")}</Button>
          <Button onClick={() => { localStorage.setItem(`mjrh_motivation_${user?.id}`, String(Date.now() + 365 * 24 * 60 * 60 * 1000)); setOpen(false); }} variant="outline" className="text-xs bg-white/10 hover:bg-white/20 text-white border-0 font-bold rounded-2xl">{t("motivate.mute", "عدم الإظهار مجدداً")}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

const SUPPORTED_LANGS_KEYS = ["ar", "en", "fr", "it", "es", "de", "zh", "ja", "pt"];
function dataExists(arr: any[], item: any) { return arr.length > 0 && !!item; }
