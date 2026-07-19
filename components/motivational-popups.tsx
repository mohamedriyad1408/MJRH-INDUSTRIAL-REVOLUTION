import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GENERAL_LANGS: Record<string, string[]> = {
  ar: [
    "كل قطعة بتخلصها بدقة بتبني ثقة عميل جديد",
    "شغلك النهارده هو سمعة المكان بكرة",
    "النظام معاك عشان يسهّل عليك، ركّز في الجودة والباقي علينا",
    "خطوة منظمة صغيرة توفر تعب كبير في آخر اليوم",
  ],
  en: [
    "Every piece you finish with precision builds trust with a new customer",
    "Your work today is the reputation of the place tomorrow",
    "The system is here to make it easier for you. Focus on quality, we handle the rest",
    "A small organized step saves a lot of exhaustion at the end of the day",
  ],
  it: [
    "Ogni pezzo che finisci con precisione costruisce la fiducia con un nuovo cliente",
    "Il tuo lavoro oggi è la reputazione del posto domani",
    "Il sistema è qui per semplificarti le cose. Concentrati sulla qualità, al resto pensiamo noi",
    "Un piccolo passo organizzato risparmia molta fatica alla fine della giornata",
  ],
  fr: [
    "Chaque pièce finie avec précision renforce la confiance du client",
    "Votre travail aujourd'hui fait la réputation de demain",
    "Le système est là pour vous faciliter la tâche. Concentrez-vous sur la qualité !",
    "Une petite étape organisée évite bien de la fatigue en fin de journée",
  ],
  es: [
    "Cada prenda terminada con precisión construye la confianza con un nuevo cliente",
    "Tu trabajo hoy es la reputación del lugar mañana",
    "El sistema está aquí para facilitarte las cosas. Concéntrate en la calidad",
    "Un pequeño paso organizado ahorra mucho cansancio al final del día",
  ],
  de: [
    "Jedes präzise bearbeitete Teil baut Vertrauen bei einem neuen Kunden auf",
    "Ihre Arbeit heute ist der Ruf von morgen",
    "Das System ist da, um es Ihnen einfacher zu machen. Konzentrieren Sie sich auf Qualität",
    "Ein kleiner organisierter Schritt spart am Ende des Tages viel Erschöpfung",
  ],
  zh: [
    "",
    "",
    "",
    "",
  ],
  ja: [
    "",
    "",
    "",
    "",
  ],
  pt: [
    "Cada peça finalizada com precisão constrói confiança com um novo cliente",
    "O seu trabalho hoje é a reputação do lugar amanhã",
    "O sistema está aqui para facilitar sua vida. Foque na qualidade, cuidamos do resto",
    "Um pequeno passo organizado poupa muito cansaço no fim do dia",
  ]
};

const BY_STATION_LANGS: Record<string, Record<string, string[]>> = {
  ar: {
    reception: ["استقبالك الحلو هو أول انطباع للعميل", "طلب واضح من البداية يعني تشغيل أسهل للنهاية"],
    cleaning: ["الغسيل المتقن هو قلب الجودة", "راجع الملاحظات قبل البداية، التفاصيل بتفرق"],
    ironing: ["الكي المتقن بيخلي القطعة تتكلم عن شغلك", "كل قميص مظبوط = عميل راجع تاني"],
    packing: ["التغليف آخر لمسة في تجربة العميل", "راجع الكود والقطعة قبل التسليم، الدقة تكسبنا ثقة"],
    driver: ["تسليمك في المعاد هو وعد بنحافظ عليه", "ابتسامتك وقت التسليم جزء من الخدمة"],
  },
  en: {
    reception: ["Your warm welcome is the customer's first impression", "A clear order at start means easier processing at the end"],
    cleaning: ["Perfect washing is the heart of quality", "Review notes before starting, details matter"],
    ironing: ["Perfect ironing makes the piece speak for your work", "Every perfect shirt = a returning customer"],
    packing: ["Packing is the final touch in the customer's experience", "Check code and piece before delivery, accuracy wins trust"],
    driver: ["On-time delivery is a promise we keep", "Your smile during delivery is part of the service"],
  },
  it: {
    reception: ["La tua calda accoglienza è la prima impressione per il cliente", "Un ordine chiaro all'inizio significa un'elaborazione più semplice alla fine"],
    cleaning: ["Un lavaggio perfetto è il cuore della qualità", "Rivedi le note prima di iniziare, i dettagli contano"],
    ironing: ["Una stiratura perfetta fa parlare il capo del tuo lavoro", "Ogni camicia perfetta = un cliente che ritorna"],
    packing: ["L'imballaggio è il tocco finale nell'esperienza del cliente", "Verifica il codice e il capo prima della consegna, l'accuratezza vince la fiducia"],
    driver: ["La consegna puntuale è una promessa che manteniamo", "Il tuo sorriso durante la consegna fa parte del servizio"],
  },
  fr: {
    reception: ["Votre accueil chaleureux est la première impression du client", "Une commande claire au début signifie un traitement plus simple à la fin"],
    cleaning: ["Un lavage parfait est le cœur de la qualité", "Lisez les notes avant de commencer, les détails comptent"],
    ironing: ["Un repassage parfait fait parler le vêtement de votre travail", "Chaque chemise parfaite = un client qui revient"],
    packing: ["L'emballage est la touche finale de l'expérience client", "Vérifiez le code et l'article avant livraison, la précision gagne la confiance"],
    driver: ["La livraison à temps est une promesse tenue", "Votre sourire lors de la livraison fait partie du service"],
  },
  es: {
    reception: ["Tu cálida bienvenida es la primera impresión del cliente", "Un pedido claro al inicio significa un procesamiento más fácil al final"],
    cleaning: ["El lavado perfecto es el corazón de la calidad", "Revisa las notas antes de comenzar, los detalles importan"],
    ironing: ["El planchado perfecto hace que la prenda hable de tu trabajo", "Cada camisa perfecta = un cliente que regresa"],
    packing: ["El empaque es el toque final en la experiencia del cliente", "Verifica el código y la prenda antes de la entrega, la precisión gana confianza"],
    driver: ["La entrega a tiempo es una promesa que mantenemos", "Tu sonrisa durante la entrega es parte del servicio"],
  },
  de: {
    reception: ["Ihr herzlicher Empfang ist der erste Eindruck des Kunden", "Ein klarer Auftrag zu Beginn bedeutet eine einfachere Bearbeitung am Ende"],
    cleaning: ["Perfektes Waschen ist das Herzstück der Qualität", "Überprüfen Sie die Notizen vor dem Start, Details zählen"],
    ironing: ["Perfektes Bügeln lässt das Stück für Ihre Arbeit sprechen", "Jedes perfekte Hemd = ein wiederkehrender Kunde"],
    packing: ["Die Verpackung ist der letzte Schliff im Kundenerlebnis", "Überprüfen Sie Code und Stück vor der Auslieferung, Genauigkeit gewinnt Vertrauen"],
    driver: ["Pünktliche Lieferung ist ein Versprechen, das wir halten", "Ihr Lächeln bei der Lieferung ist Teil des Service"],
  },
  zh: {
    reception: ["", ""],
    cleaning: ["", ""],
    ironing: ["", ""],
    packing: ["", ""],
    driver: ["", ""],
  },
  ja: {
    reception: ["", ""],
    cleaning: ["", ""],
    ironing: ["", "="],
    packing: ["", ""],
    driver: ["", ""],
  },
  pt: {
    reception: ["Sua recepção calorosa é a primeira impressão do cliente", "Um pedido claro no início significa um processamento mais fácil no fim"],
    cleaning: ["Uma lavagem perfeita é o coração da qualidade", "Revise as notas antes de começar, os detalhes importan"],
    ironing: ["Uma passadoria perfeita faz a peça falar pelo seu trabalho", "Cada camisa perfeita = um cliente que retorna"],
    packing: ["A embalagem é o toque final na experiência do cliente", "Verifique o código e a peça antes da entrega, a precisão ganha confiança"],
    driver: ["A entrega no prazo é uma promessa que mantemos", "Seu sorriso na entrega é parte do serviço"],
  }
};

function isMobile() { return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches; }

export function MotivationalPopups() {
  return null;
}

const SUPPORTED_LANGS_KEYS = ["ar", "en", "fr", "it", "es", "de", "zh", "ja", "pt"];
function dataExists(arr: any[], item: any) { return arr.length > 0 && !!item; }
