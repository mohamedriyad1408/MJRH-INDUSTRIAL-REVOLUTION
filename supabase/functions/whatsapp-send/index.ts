// MJRH — WhatsApp Business API Send Edge Function
// Sends outgoing WhatsApp messages via WhatsApp Business Cloud API.
// Updates customer_messages table status to 'sent'.
//
// Deploy with: supabase functions deploy whatsapp-send
// Call from client with: supabase.functions.invoke('whatsapp-send', { body: { id, phone, message } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function getCallerId(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: missing token");
  const token = authHeader.replace("Bearer ", "");
  const sb = getAdminClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized: invalid token");
  return data.user.id;
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10) return `20${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const callerId = await getCallerId(req);
    const sb = getAdminClient();
    const body = await req.json();
    const { id, phone, message } = body;

    if (!id || !phone || !message) {
      throw new Error("Missing required parameters: id, phone, message");
    }

    const normalizedPhone = normalizeWhatsAppPhone(phone);
    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (whatsappToken && phoneNumberId) {
      const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "text",
          text: { body: message },
        }),
      });

      if (!fbResponse.ok) {
        const errText = await fbResponse.text();
        throw new Error(`WhatsApp API Error: ${errText}`);
      }
    }

    // Update message status in the database
    const { error: updateErr } = await sb.from("customer_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw new Error(updateErr.message);

    return new Response(JSON.stringify({ ok: true, sent_to: normalizedPhone }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
