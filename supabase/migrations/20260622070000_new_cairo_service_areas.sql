-- New Cairo service areas / compounds directory for faster address entry and better live map accuracy.

CREATE TABLE IF NOT EXISTS public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_type text NOT NULL DEFAULT 'district', -- district | compound | street | landmark
  aliases text[] NOT NULL DEFAULT '{}',
  lat double precision,
  lng double precision,
  default_delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS service_areas_tenant_name_idx ON public.service_areas(tenant_id, name);
CREATE INDEX IF NOT EXISTS service_areas_geo_idx ON public.service_areas(lat, lng);
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_areas_tenant_all ON public.service_areas;
CREATE POLICY service_areas_tenant_all ON public.service_areas
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

WITH catalogue(name, area_type, aliases, lat, lng, fee) AS (
  VALUES
    ('البنفسج', 'district', ARRAY['بنفسج','البنفسج عمارات','البنفسج فيلات'], 30.0564, 31.4737, 60),
    ('الياسمين', 'district', ARRAY['ياسمين','الياسمين فيلات','الياسمين عمارات'], 30.0437, 31.4617, 60),
    ('النرجس', 'district', ARRAY['نرجس','النرجس عمارات','النرجس فيلات','النرجس الجديدة'], 30.0079, 31.4706, 60),
    ('اللوتس', 'district', ARRAY['لوتس','اللوتس الشمالية','اللوتس الجنوبية'], 30.0197, 31.5006, 65),
    ('القرنفل', 'district', ARRAY['قرنفل','القرنفل فيلات'], 30.0715, 31.4932, 65),
    ('بيت الوطن', 'district', ARRAY['بيت الوطن التجمع','الوطن'], 30.0616, 31.5298, 75),
    ('الأندلس', 'district', ARRAY['الاندلس','أندلس'], 29.9889, 31.4896, 70),
    ('جنوب الأكاديمية', 'district', ARRAY['جنوب الاكاديمية','الأكاديمية'], 30.0416, 31.4444, 55),
    ('غرب الجولف', 'district', ARRAY['الجولف','غرب جولف'], 30.0326, 31.4372, 55),
    ('المستثمرين الشمالية', 'district', ARRAY['المستثمرين شمال','شمال المستثمرين'], 30.0277, 31.4816, 60),
    ('المستثمرين الجنوبية', 'district', ARRAY['المستثمرين جنوب','جنوب المستثمرين'], 29.9982, 31.4834, 65),
    ('الشويفات', 'district', ARRAY['شويفات','منطقة الشويفات'], 30.0239, 31.4515, 55),
    ('شارع التسعين الشمالي', 'street', ARRAY['التسعين الشمالي','North 90'], 30.0292, 31.4888, 60),
    ('شارع التسعين الجنوبي', 'street', ARRAY['التسعين الجنوبي','South 90'], 30.0059, 31.4678, 60),
    ('الجامعة الأمريكية AUC', 'landmark', ARRAY['AUC','الجامعة الامريكية','الجامعة الأمريكية'], 30.0186, 31.5011, 65),

    ('الرحاب', 'compound', ARRAY['مدينة الرحاب','Rehab'], 30.0639, 31.4887, 75),
    ('مدينتي', 'compound', ARRAY['Madinaty'], 30.0930, 31.6404, 120),
    ('ميفيدا', 'compound', ARRAY['Mivida'], 30.0096, 31.5431, 85),
    ('هايد بارك', 'compound', ARRAY['Hyde Park'], 29.9644, 31.5445, 95),
    ('ماونتن فيو هايد بارك', 'compound', ARRAY['Mountain View Hyde Park','ماونتن فيو'], 29.9770, 31.5440, 95),
    ('بالم هيلز قطامية', 'compound', ARRAY['Palm Hills Katameya','PK1','PK2'], 29.9827, 31.5366, 90),
    ('فيليت سوديك', 'compound', ARRAY['Villette','Sodic Villette'], 29.9746, 31.5276, 90),
    ('إيستاون', 'compound', ARRAY['Eastown','سوديك ايستاون'], 30.0138, 31.5112, 75),
    ('فيفث سكوير', 'compound', ARRAY['Fifth Square','المراسم'], 30.0248, 31.5365, 85),
    ('ذا فيلدج', 'compound', ARRAY['The Village'], 30.0167, 31.5031, 70),
    ('جاليريا مون فالي', 'compound', ARRAY['Galleria','Moon Valley'], 30.0114, 31.5126, 75),
    ('ديار المخابرات', 'compound', ARRAY['ديار','Dyar'], 30.0191, 31.5180, 75),
    ('قطامية هايتس', 'compound', ARRAY['Katameya Heights'], 29.9910, 31.4268, 80),
    ('ميراج سيتي', 'compound', ARRAY['Mirage City','الميراج'], 30.0726, 31.4318, 80),
    ('ليان صبور', 'compound', ARRAY['Layan','ليان'], 29.9587, 31.5294, 95),
    ('لا فيستا سيتي', 'compound', ARRAY['La Vista City'], 30.0400, 31.6000, 110)
)
INSERT INTO public.service_areas(name, area_type, aliases, lat, lng, default_delivery_fee, tenant_id)
SELECT c.name, c.area_type, c.aliases, c.lat, c.lng, c.fee, t.id
FROM public.tenants t
CROSS JOIN catalogue c
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_areas s
  WHERE s.tenant_id = t.id AND s.name = c.name
);
