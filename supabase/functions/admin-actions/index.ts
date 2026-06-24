// MJRH — Admin Actions Edge Function
// Replaces the 6 TanStack Start server functions that used to live in
// src/lib/admin.functions.ts. Runs on Supabase Edge Functions (Deno).
//
// Deploy with: supabase functions deploy admin-actions
// Call from the client with: supabase.functions.invoke('admin-actions', { body: { action, ...payload } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function admin() {
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
  const sb = admin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized: invalid token");
  return data.user.id;
}

async function assertSuperAdmin(sb: ReturnType<typeof admin>, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (!data) throw new Error("غير مصرح: مدير المنصة فقط");
}

async function assertTenantOwner(sb: ReturnType<typeof admin>, userId: string, tenantId: string) {
  const { data: sa } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (sa) return;
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", tenantId).eq("role", "owner").maybeSingle();
  if (!data) throw new Error("غير مصرح: مالك المغسلة فقط");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const callerId = await getCallerId(req);
    const sb = admin();
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ============ Super Admin: إنشاء مغسلة جديدة بمالكها ============
      case "createTenant": {
        await assertSuperAdmin(sb, callerId);
        const { name, slug, ownerEmail, ownerPassword, ownerFullName, lat, lng, locationUrl, operatingRadiusKm } = body;

        const { data: tenant, error: tErr } = await sb.from("tenants").insert({ name, slug, lat: lat ?? null, lng: lng ?? null, location_url: locationUrl ?? null, operating_radius_km: operatingRadiusKm ?? 8 }).select().single();
        if (tErr) throw new Error(tErr.message);

        let ownerId: string;
        const { data: created, error: uErr } = await sb.auth.admin.createUser({
          email: ownerEmail, password: ownerPassword, email_confirm: true,
          user_metadata: { full_name: ownerFullName },
        });
        if (uErr) {
          const { data: list } = await sb.auth.admin.listUsers();
          const existing = list.users.find((u) => u.email === ownerEmail);
          if (!existing) {
            await sb.from("tenants").delete().eq("id", tenant.id);
            throw new Error(uErr.message);
          }
          ownerId = existing.id;
        } else {
          ownerId = created.user!.id;
        }

        await sb.from("tenants").update({ owner_user_id: ownerId }).eq("id", tenant.id);
        await sb.from("user_roles").insert({ user_id: ownerId, role: "owner", tenant_id: tenant.id });
        await sb.from("app_settings").insert({ tenant_id: tenant.id, business_name: name });
        await sb.from("employees").upsert({
          tenant_id: tenant.id,
          profile_id: ownerId,
          full_name: ownerFullName || name,
          email: ownerEmail,
          job_title: "مالك المغسلة",
          role: "owner",
          job_role: "other",
          monthly_salary: 0,
          commission_percent: 0,
          is_active: true,
        }, { onConflict: "tenant_id,email" }).then(() => null);
        await sb.rpc("ensure_default_cash_account_for", { _tenant_id: tenant.id }).then(() => null);
        await sb.rpc("ensure_default_chart_accounts_for", { _tenant_id: tenant.id }).then(() => null);

        return json({ tenant_id: tenant.id });
      }

      // ============ Owner: إنشاء مستخدم داخل المغسلة ============
      case "createTenantUser": {
        const { tenantId, email, password, fullName, role, station, jobRole, monthlySalary, commissionPercent } = body;
        await assertTenantOwner(sb, callerId, tenantId);

        const { data: created, error } = await sb.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { full_name: fullName },
        });
        let userId: string;
        if (error) {
          const { data: list } = await sb.auth.admin.listUsers();
          const existing = list.users.find((u) => u.email === email);
          if (!existing) throw new Error(error.message);
          userId = existing.id;
        } else {
          userId = created.user!.id;
        }

        const { error: rErr } = await sb.from("user_roles").insert({ user_id: userId, role, tenant_id: tenantId });
        if (rErr) throw new Error(rErr.message);

        if (["employee", "courier", "cs_manager", "ops_manager"].includes(role)) {
          const employeePayload: Record<string, unknown> = {
            tenant_id: tenantId,
            profile_id: userId,
            full_name: fullName,
            email,
            job_title: role === "courier" ? "مندوب" : role === "cs_manager" ? "خدمة عملاء" : role === "ops_manager" ? "مدير تشغيل" : "موظف",
            role,
            station: station || (role === "courier" ? "delivery" : null),
            job_role: jobRole || (role === "courier" ? "driver" : "other"),
            monthly_salary: Number(monthlySalary ?? 0),
            commission_percent: Number(commissionPercent ?? 0),
            is_active: true,
          };
          await sb.from("employees").upsert(employeePayload, { onConflict: "tenant_id,email" }).then(({ error }) => {
            if (error) throw new Error(error.message);
          });
        }

        return json({ user_id: userId });
      }

      // ============ Super Admin: قائمة كل المستخدمين ============
      case "listAllUsers": {
        await assertSuperAdmin(sb, callerId);
        const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const { data: roles } = await sb.from("user_roles").select("user_id, role, tenant_id");
        const { data: tenants } = await sb.from("tenants").select("id, name");

        return json({
          users: (users?.users ?? []).map((u) => ({
            id: u.id, email: u.email, created_at: u.created_at,
            roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => ({
              role: r.role, tenant_id: r.tenant_id,
              tenant_name: tenants?.find((t) => t.id === r.tenant_id)?.name ?? null,
            })),
          })),
        });
      }

      // ============ Super Admin: حذف مستخدم ============
      case "deleteUser": {
        await assertSuperAdmin(sb, callerId);
        const { userId } = body;
        if (userId === callerId) throw new Error("لا يمكنك حذف حسابك");
        const { error } = await sb.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }

      // ============ Super Admin: إعادة تعيين كلمة مرور أي مستخدم ============
      case "resetUserPassword": {
        await assertSuperAdmin(sb, callerId);
        const { userId, newPassword } = body;
        const { error } = await sb.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
