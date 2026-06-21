-- Make the starter catalogue visible for every tenant.
-- Previous global rows with tenant_id NULL are not useful with tenant RLS.

DELETE FROM public.service_items
WHERE tenant_id IS NULL
  AND name IN (
    'قميص مكوي','بنطلون مكوي','تيشيرت مكوي','بلوزة مكوية','جاكيت مكوي','بدلة مكوية','عباية مكوية','فستان مكوي','ملاية مكوية','ستارة مكوية',
    'قميص تنظيف وكي','بنطلون تنظيف وكي','تيشيرت تنظيف وكي','بلوزة تنظيف وكي','جاكيت تنظيف وكي','بدلة تنظيف وكي','عباية تنظيف وكي','فستان تنظيف وكي','بطانية تنظيف','لحاف تنظيف','ملاية تنظيف وكي','ستارة تنظيف وكي','سجادة صغيرة تنظيف',
    'تقصير بنطلون','توسيع / تضييق بنطلون','تركيب سوستة','تغيير سوستة جاكيت','تركيب زرار','تركيب أزرار كاملة','رتق قطع بسيط','رتق قطع كبير','تقصير كم','تقصير فستان/عباية','إصلاح بطانة','تضييق قميص/بلوزة'
  );

WITH catalogue(name, service_type, unit_price) AS (
  VALUES
    ('قميص مكوي','ironing'::public.service_type,20::numeric),
    ('بنطلون مكوي','ironing',25),
    ('تيشيرت مكوي','ironing',15),
    ('بلوزة مكوية','ironing',25),
    ('جاكيت مكوي','ironing',45),
    ('بدلة مكوية','ironing',80),
    ('عباية مكوية','ironing',50),
    ('فستان مكوي','ironing',70),
    ('ملاية مكوية','ironing',35),
    ('ستارة مكوية','ironing',60),

    ('قميص تنظيف وكي','both',45),
    ('بنطلون تنظيف وكي','both',50),
    ('تيشيرت تنظيف وكي','both',35),
    ('بلوزة تنظيف وكي','both',45),
    ('جاكيت تنظيف وكي','both',85),
    ('بدلة تنظيف وكي','both',150),
    ('عباية تنظيف وكي','both',90),
    ('فستان تنظيف وكي','both',130),
    ('بطانية تنظيف','both',180),
    ('لحاف تنظيف','both',220),
    ('ملاية تنظيف وكي','both',60),
    ('ستارة تنظيف وكي','both',120),
    ('سجادة صغيرة تنظيف','both',120),

    ('تقصير بنطلون','cleaning',40),
    ('توسيع / تضييق بنطلون','cleaning',60),
    ('تركيب سوستة','cleaning',70),
    ('تغيير سوستة جاكيت','cleaning',120),
    ('تركيب زرار','cleaning',15),
    ('تركيب أزرار كاملة','cleaning',50),
    ('رتق قطع بسيط','cleaning',45),
    ('رتق قطع كبير','cleaning',90),
    ('تقصير كم','cleaning',50),
    ('تقصير فستان/عباية','cleaning',90),
    ('إصلاح بطانة','cleaning',100),
    ('تضييق قميص/بلوزة','cleaning',70)
)
INSERT INTO public.service_items(name, service_type, unit_price, is_active, tenant_id)
SELECT c.name, c.service_type, c.unit_price, true, t.id
FROM public.tenants t
CROSS JOIN catalogue c
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_items s
  WHERE s.tenant_id = t.id AND s.name = c.name
);
