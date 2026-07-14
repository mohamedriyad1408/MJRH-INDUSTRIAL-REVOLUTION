-- QC issue workflow for repair/damaged/lost with owner notification and customer message.

CREATE OR REPLACE FUNCTION public.register_qc_issue(_unit_id uuid, _result text, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  title text;
BEGIN
  IF _result NOT IN ('repair','damaged','lost') THEN
    RAISE EXCEPTION 'نوع مشكلة الجودة غير صحيح';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'سبب مشكلة الجودة مطلوب';
  END IF;

  SELECT su.*, o.order_number, o.customer_id, c.full_name, c.phone INTO u
  FROM public.service_units su
  JOIN public.orders o ON o.id = su.order_id
  LEFT JOIN public.customers c ON c.id = o.customer_id
  WHERE su.id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  title := CASE _result
    WHEN 'repair' THEN 'قطعة تحتاج تصليح'
    WHEN 'damaged' THEN 'قطعة تالفة'
    WHEN 'lost' THEN 'قطعة مفقودة'
    ELSE 'مشكلة جودة'
  END;

  UPDATE public.service_units
  SET current_stage = 'qc_failed',
      needs_reclean = false,
      reclean_reason = NULL,
      staff_notes = trim(COALESCE(staff_notes,'') || E'\n[QC] ' || title || ': ' || _reason)
  WHERE id = _unit_id;

  INSERT INTO public.qc_checks(tenant_id, order_id, service_unit_id, result, severity, notes, checked_by)
  VALUES (u.tenant_id, u.order_id, u.id, _result, 'high', _reason, auth.uid());

  INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
  VALUES
    (u.tenant_id, 'owner', title, 'طلب #' || COALESCE(u.order_number::text,'') || ' - ' || u.label_code || ' - ' || _reason, '/orders/' || u.order_id, 'danger'),
    (u.tenant_id, 'ops', title, 'طلب #' || COALESCE(u.order_number::text,'') || ' - ' || u.label_code || ' - ' || _reason, '/stations/qc', 'danger');

  IF u.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_messages(tenant_id, customer_id, order_id, channel, template_key, phone, message, status)
    VALUES (u.tenant_id, u.customer_id, u.order_id, 'whatsapp', 'qc_issue_notice', u.phone,
      'تنبيه بخصوص طلب #' || COALESCE(u.order_number::text,'') || ': يوجد ملاحظة جودة على قطعة (' || u.label_code || '). سيتم التواصل معك من إدارة المغسلة. الملاحظة: ' || _reason,
      'queued');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_qc_issue(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pass_qc_unit(_unit_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
BEGIN
  SELECT * INTO u FROM public.service_units WHERE id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  UPDATE public.service_units
  SET current_stage = 'qc_passed',
      needs_reclean = false,
      reclean_reason = NULL,
      reclean_resolved_at = CASE WHEN reclean_reported_at IS NOT NULL AND reclean_resolved_at IS NULL THEN now() ELSE reclean_resolved_at END
  WHERE id = _unit_id;

  INSERT INTO public.qc_checks(tenant_id, order_id, service_unit_id, result, severity, notes, checked_by)
  VALUES (u.tenant_id, u.order_id, u.id, 'passed', 'normal', _notes, auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION public.pass_qc_unit(uuid,text) TO authenticated;
