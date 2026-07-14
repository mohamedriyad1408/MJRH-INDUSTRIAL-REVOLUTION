-- Tenant location and operating zones.
-- Service areas are enabled per tenant only if they are inside at least one active operating zone.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_url text,
  ADD COLUMN IF NOT EXISTS operating_radius_km numeric(8,2) DEFAULT 8;

CREATE TABLE IF NOT EXISTS public.tenant_operating_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'النطاق الرئيسي',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_km numeric(8,2) NOT NULL DEFAULT 8,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_operating_zones_tenant_idx ON public.tenant_operating_zones(tenant_id);
ALTER TABLE public.tenant_operating_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_operating_zones_tenant_all ON public.tenant_operating_zones;
CREATE POLICY tenant_operating_zones_tenant_all ON public.tenant_operating_zones
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.can_access_tenant(tenant_id) OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.geo_distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE 6371 * 2 * asin(sqrt(
      power(sin(radians((lat2-lat1)/2)),2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lng2-lng1)/2)),2)
    ))
  END
$$;

CREATE OR REPLACE FUNCTION public.refresh_tenant_service_areas(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no active zones exist, leave all areas active to avoid breaking a new tenant before setup.
  IF NOT EXISTS (SELECT 1 FROM public.tenant_operating_zones WHERE tenant_id = _tenant_id AND is_active) THEN
    UPDATE public.service_areas SET is_active = true WHERE tenant_id = _tenant_id;
    RETURN;
  END IF;

  UPDATE public.service_areas a
  SET is_active = EXISTS (
    SELECT 1
    FROM public.tenant_operating_zones z
    WHERE z.tenant_id = _tenant_id
      AND z.is_active
      AND a.lat IS NOT NULL AND a.lng IS NOT NULL
      AND public.geo_distance_km(z.lat, z.lng, a.lat, a.lng) <= z.radius_km
  )
  WHERE a.tenant_id = _tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenant_main_zone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    INSERT INTO public.tenant_operating_zones(tenant_id, name, lat, lng, radius_km, is_active)
    VALUES (NEW.id, 'النطاق الرئيسي', NEW.lat, NEW.lng, COALESCE(NEW.operating_radius_km, 8), true)
    ON CONFLICT DO NOTHING;

    UPDATE public.tenant_operating_zones
    SET lat = NEW.lat, lng = NEW.lng, radius_km = COALESCE(NEW.operating_radius_km, 8), is_active = true
    WHERE tenant_id = NEW.id AND name = 'النطاق الرئيسي';

    PERFORM public.refresh_tenant_service_areas(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenant_main_zone ON public.tenants;
CREATE TRIGGER trg_sync_tenant_main_zone
AFTER INSERT OR UPDATE OF lat, lng, operating_radius_km ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_main_zone();

CREATE OR REPLACE FUNCTION public.refresh_service_areas_after_zone_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tid uuid;
BEGIN
  tid := COALESCE(NEW.tenant_id, OLD.tenant_id);
  PERFORM public.refresh_tenant_service_areas(tid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_service_areas_zone ON public.tenant_operating_zones;
CREATE TRIGGER trg_refresh_service_areas_zone
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_operating_zones
FOR EACH ROW EXECUTE FUNCTION public.refresh_service_areas_after_zone_change();

-- Initialize zones for existing tenants that already have a location.
INSERT INTO public.tenant_operating_zones(tenant_id, name, lat, lng, radius_km, is_active)
SELECT id, 'النطاق الرئيسي', lat, lng, COALESCE(operating_radius_km, 8), true
FROM public.tenants
WHERE lat IS NOT NULL AND lng IS NOT NULL
ON CONFLICT DO NOTHING;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.refresh_tenant_service_areas(r.id);
  END LOOP;
END $$;
