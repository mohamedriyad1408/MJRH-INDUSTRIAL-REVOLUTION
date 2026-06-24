import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OcrResult = {
  text: string;
  amount: number | null;
  confidence: number | null;
  raw: unknown;
  error?: string;
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function normalizeNumber(s: string) {
  const cleaned = s.replace(/,/g, "").replace(/\s/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractAmount(text: string): number | null {
  const t = text.replace(/\u200f|\u200e/g, " ");

  // Best case: amount directly next to currency marker.
  const currencyPatterns = [
    /([0-9٠-٩۰-۹][0-9٠-٩۰-۹,\.\s]{0,14})\s*(?:EGP|E\.G\.P|ج\.م|جنيه|ج\b)/gi,
    /(?:EGP|E\.G\.P|ج\.م|جنيه|ج\b)\s*([0-9٠-٩۰-۹][0-9٠-٩۰-۹,\.\s]{0,14})/gi,
  ];
  for (const re of currencyPatterns) {
    const hits = [...t.matchAll(re)]
      .map((m) => normalizeNumber(m[1]))
      .filter((n): n is number => n !== null && n > 0 && n < 100000);
    if (hits.length) return hits[0];
  }

  // Second best: numbers near transfer amount labels.
  const lines = t.split(/\n|\r/).map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/transfer amount|amount|مبلغ|التحويل/i.test(lines[i])) {
      const nearby = [lines[i - 1], lines[i], lines[i + 1]].filter(Boolean).join(" ");
      const nums = [...nearby.matchAll(/[0-9٠-٩۰-۹][0-9٠-٩۰-۹,\.]{0,14}/g)]
        .map((m) => ({ raw: m[0], n: normalizeNumber(m[0]) }))
        .filter((x) => x.n !== null && x.n > 0 && x.n < 100000 && x.raw.replace(/\D/g, "").length <= 6)
        .map((x) => x.n as number);
      if (nums.length) return nums[0];
    }
  }

  // Fallback: choose the largest reasonable short number, excluding reference/phone/date long numbers.
  const candidates = [...t.matchAll(/[0-9٠-٩۰-۹][0-9٠-٩۰-۹,\.]{1,14}/g)]
    .map((m) => ({ raw: m[0], n: normalizeNumber(m[0]) }))
    .filter((x) => {
      if (x.n === null || x.n <= 0 || x.n > 50000) return false;
      const digits = x.raw.replace(/[^0-9٠-٩۰-۹]/g, "");
      if (digits.length >= 7 && !x.raw.includes(",")) return false; // reference/phone/account
      if (x.n >= 1900 && x.n <= 2100) return false; // year
      return true;
    })
    .map((x) => x.n as number);
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

async function runOcrSpace(imageUrl: string): Promise<OcrResult> {
  const key = Deno.env.get("OCR_SPACE_API_KEY");
  if (!key) return { text: "", amount: null, confidence: null, raw: null, error: "OCR_SPACE_API_KEY is missing" };

  const form = new FormData();
  form.set("url", imageUrl);
  form.set("language", "eng");
  form.set("isOverlayRequired", "false");
  form.set("OCREngine", "2");
  form.set("scale", "true");
  form.set("detectOrientation", "true");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: key },
    body: form,
  });
  const raw = await res.json();
  if (!res.ok) return { text: "", amount: null, confidence: null, raw, error: `OCR HTTP ${res.status}` };

  const parsed = raw?.ParsedResults?.[0];
  const text = String(parsed?.ParsedText ?? "");
  const error = raw?.IsErroredOnProcessing ? String(raw?.ErrorMessage ?? parsed?.ErrorMessage ?? "OCR failed") : undefined;
  const amount = text ? extractAmount(text) : null;
  return { text, amount, confidence: null, raw, error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const body = await req.json();
    const { phone, slug, orderId, proofUrl, typedAmount } = body;
    if (!phone || !orderId || !proofUrl) throw new Error("بيانات الدفع ناقصة");

    const sb = admin();
    const ocr = await runOcrSpace(proofUrl);
    const typed = Number(typedAmount || 0) || null;
    const amountToUse = ocr.amount ?? typed;

    if (!amountToUse) {
      await sb.from("orders").update({
        payment_proof_url: proofUrl,
        payment_proof_uploaded_at: new Date().toISOString(),
        customer_payment_amount: typed,
        payment_verification_status: "pending_review",
        payment_ocr_text: ocr.text || null,
        payment_ocr_provider: "ocr.space",
        payment_ocr_confidence: ocr.confidence,
        payment_ocr_checked_at: new Date().toISOString(),
        payment_ocr_error: ocr.error || "لم يتم استخراج مبلغ من الصورة",
      }).eq("id", orderId);

      return new Response(JSON.stringify({
        ok: true,
        status: "pending_review",
        amount: null,
        ocrText: ocr.text,
        message: "تم رفع الإيصال لكن لم نستطع قراءة المبلغ، سيتم مراجعته يدويًا",
      }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: rpc, error: rpcErr } = await sb.rpc("customer_portal_submit_instapay_payment", {
      _phone: phone,
      _slug: slug ?? null,
      _order_id: orderId,
      _proof_url: proofUrl,
      _amount: typed ?? amountToUse,
      _detected_amount: ocr.amount,
    }).maybeSingle();
    if (rpcErr) throw new Error(rpcErr.message);

    await sb.from("orders").update({
      payment_ocr_text: ocr.text || null,
      payment_ocr_provider: "ocr.space",
      payment_ocr_confidence: ocr.confidence,
      payment_ocr_checked_at: new Date().toISOString(),
      payment_ocr_error: ocr.error || null,
    }).eq("id", orderId);

    return new Response(JSON.stringify({
      ok: true,
      ...rpc,
      ocrAmount: ocr.amount,
      typedAmount: typed,
      ocrText: ocr.text,
      ocrError: ocr.error,
      message: rpc?.message ?? "تمت مراجعة الإيصال",
    }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
