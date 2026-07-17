-- Branding for every tenant/project.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_url text;
CREATE INDEX IF NOT EXISTS tenants_business_type_idx ON public.tenants(business_type);
