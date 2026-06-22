-- Customer location foundation for live map accuracy.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_url text,
  ADD COLUMN IF NOT EXISTS area text;

CREATE INDEX IF NOT EXISTS customers_geo_idx ON public.customers(lat, lng);
