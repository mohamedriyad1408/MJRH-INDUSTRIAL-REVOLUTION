
-- Create proper station enum and migrate employees.station to it
DO $$ BEGIN
  CREATE TYPE public.station_type AS ENUM ('reception','cleaning','ironing','packing','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees ALTER COLUMN station DROP DEFAULT;
ALTER TABLE public.employees ALTER COLUMN station TYPE public.station_type USING (
  CASE station::text
    WHEN 'cleaning' THEN 'cleaning'::public.station_type
    WHEN 'ironing'  THEN 'ironing'::public.station_type
    WHEN 'both'     THEN NULL
    ELSE NULL
  END
);
