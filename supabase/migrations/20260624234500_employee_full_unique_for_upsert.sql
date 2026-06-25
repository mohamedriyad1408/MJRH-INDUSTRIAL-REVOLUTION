-- Full unique indexes used by Supabase upsert onConflict from Edge Functions.
-- PostgreSQL unique indexes still allow multiple NULL values.
CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_email_unique_full
ON public.employees(tenant_id, email);

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_profile_unique_full
ON public.employees(tenant_id, profile_id);
