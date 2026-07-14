// MJRH — PMS Bridge Edge Function — Mews Sandbox (free trial) + Generic Webhook
// Zero extra cost, runs on Supabase Edge (within free tier)
// Deploy: supabase functions deploy pms-bridge

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const sb = admin();

    // Health check
    if (url.searchParams.get("health") === "1" || path.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true, service: "pms-bridge", timestamp: new Date().toISOString() }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Mock Mews Sandbox: POST /pms-bridge?mock=mews&action=checkin
    // Body: { tenant_id, room_number, guest_name, reservation_id }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Validate whitelist (security mandatory — no eval)
      const allowedActions = ["checkin", "checkout", "folio_post", "housekeeping_task"];
      const action = body.action || url.searchParams.get("action");

      if (action && !allowedActions.includes(action)) {
        return new Response(JSON.stringify({ ok: false, error: `Invalid action: ${action}, allowed: ${allowedActions.join(", ")}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const tenantId = body.tenant_id;
      if (!tenantId) {
        return new Response(JSON.stringify({ ok: false, error: "tenant_id required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Check tenant exists and is v2
      const { data: tenant } = await sb.from("tenants").select("id, workflow_engine_version, name").eq("id", tenantId).single();
      if (!tenant) {
        return new Response(JSON.stringify({ ok: false, error: "Tenant not found" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Action: checkin → create housekeeping work_order automatically
      if (action === "checkin") {
        const { room_number, guest_name, reservation_id } = body;
        if (!room_number) {
          return new Response(JSON.stringify({ ok: false, error: "room_number required for checkin" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        // Find housekeeping workflow template (hospitality)
        const { data: wf } = await sb
          .from("workflow_definitions")
          .select("id")
          .eq("industry", "hospitality")
          .eq("is_template", true)
          .limit(1)
          .maybeSingle();

        const workflowId = wf?.id || "00000000-0000-0000-0000-000000000002";

        // Create work_order with snapshot preserved
        const { data: wo, error } = await sb
          .from("work_orders")
          .insert({
            tenant_id: tenantId,
            workflow_id: workflowId,
            title: `تنظيف غرفة ${room_number} — Check-in ${guest_name || ""}`,
            custom_fields: {
              room_number,
              guest_name: guest_name || "",
              reservation_id: reservation_id || "",
              guest_status: "occupied",
              cleaning_type: "checkout",
              source: "pms",
              pms: "mews_sandbox",
            },
            status: "open",
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            ok: true,
            message: `Housekeeping task created for room ${room_number} (Mews Sandbox mock)`,
            work_order_id: wo.id,
            workflow_id: workflowId,
            note: "Zero-cost: This is a mock adapter. Real Opera/PMS needs VPN/PCI and is in Pro deferred section.",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Action: folio_post → add amount to guest folio (mock, avoids PCI)
      if (action === "folio_post") {
        const { room_number, amount, description, work_order_id } = body;
        if (!room_number || !amount) {
          return new Response(JSON.stringify({ ok: false, error: "room_number and amount required" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        // In real Mews, this would call Mews API: POST /api/connector/v1/bills/add
        // Here we just record as intercompany-like transaction and notification (zero-cost, avoids PCI)
        const { error } = await sb.from("app_notifications").insert({
          tenant_id: tenantId,
          audience: "owner",
          title: `Folio posting: غرفة ${room_number} — ${amount}`,
          body: `خدمة مكتملة: ${description || "Service"} — المبلغ ${amount} يجب إضافته لفاتورة الغرفة في PMS (Mews). WorkOrder ${work_order_id || ""} — تجنب PCI DSS بكتابة على folio وليس لمس كارت.`,
          href: "/finance",
          tone: "info",
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            ok: true,
            message: `Folio posting recorded for room ${room_number}, amount ${amount} — mock, real Mews API would be called here`,
            note: "Zero-cost: We avoid PCI by posting to folio, not charging card directly. Real Opera needs Pro.",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, usage: "POST ?action=checkin|folio_post with tenant_id, room_number" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
