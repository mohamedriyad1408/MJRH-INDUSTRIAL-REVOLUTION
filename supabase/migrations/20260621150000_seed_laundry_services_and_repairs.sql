-- Practical starter catalogue for laundry POS.
-- We keep service_type='cleaning' internally for compatibility, but the UI displays it as "تصليح".

DO $$
DECLARE
  items text[][] := ARRAY[
    ARRAY['قميص مكوي','ironing','20'],
    ARRAY['بنطلون مكوي','ironing','25'],
    ARRAY['تيشيرت مكوي','ironing','15'],
    ARRAY['بلوزة مكوية','ironing','25'],
    ARRAY['جاكيت مكوي','ironing','45'],
    ARRAY['بدلة مكوية','ironing','80'],
    ARRAY['عباية مكوية','ironing','50'],
    ARRAY['فستان مكوي','ironing','70'],
    ARRAY['ملاية مكوية','ironing','35'],
    ARRAY['ستارة مكوية','ironing','60'],

    ARRAY['قميص تنظيف وكي','both','45'],
    ARRAY['بنطلون تنظيف وكي','both','50'],
    ARRAY['تيشيرت تنظيف وكي','both','35'],
    ARRAY['بلوزة تنظيف وكي','both','45'],
    ARRAY['جاكيت تنظيف وكي','both','85'],
    ARRAY['بدلة تنظيف وكي','both','150'],
    ARRAY['عباية تنظيف وكي','both','90'],
    ARRAY['فستان تنظيف وكي','both','130'],
    ARRAY['بطانية تنظيف','both','180'],
    ARRAY['لحاف تنظيف','both','220'],
    ARRAY['ملاية تنظيف وكي','both','60'],
    ARRAY['ستارة تنظيف وكي','both','120'],
    ARRAY['سجادة صغيرة تنظيف','both','120'],

    ARRAY['تقصير بنطلون','cleaning','40'],
    ARRAY['توسيع / تضييق بنطلون','cleaning','60'],
    ARRAY['تركيب سوستة','cleaning','70'],
    ARRAY['تغيير سوستة جاكيت','cleaning','120'],
    ARRAY['تركيب زرار','cleaning','15'],
    ARRAY['تركيب أزرار كاملة','cleaning','50'],
    ARRAY['رتق قطع بسيط','cleaning','45'],
    ARRAY['رتق قطع كبير','cleaning','90'],
    ARRAY['تقصير كم','cleaning','50'],
    ARRAY['تقصير فستان/عباية','cleaning','90'],
    ARRAY['إصلاح بطانة','cleaning','100'],
    ARRAY['تضييق قميص/بلوزة','cleaning','70']
  ];
  it text[];
BEGIN
  FOREACH it SLICE 1 IN ARRAY items LOOP
    IF NOT EXISTS (SELECT 1 FROM public.service_items WHERE name = it[1]) THEN
      INSERT INTO public.service_items(name, service_type, unit_price, is_active)
      VALUES (it[1], it[2]::public.service_type, it[3]::numeric, true);
    END IF;
  END LOOP;
END $$;
