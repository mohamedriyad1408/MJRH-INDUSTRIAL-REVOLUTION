-- MJRH V2 — Fix ironing attendance rebalance and reception routing support
-- Date: 2026-06-27
-- Fixes: column "check_in_at" does not exist in rebalance temp table.

CREATE OR REPLACE FUNCTION public.rebalance_ironing_assignments(
  _order_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  bid uuid;
  emp_count integer := 0;
  assigned_count integer := 0;
  u record;
  chosen uuid;
BEGIN
  IF _order_id IS NOT NULL THEN
    SELECT tenant_id, branch_id INTO tid, bid FROM public.orders WHERE id = _order_id;
  END IF;
  tid := COALESCE(tid, _tenant_id, public.current_tenant_id());
  bid := COALESCE(_branch_id, bid);
  IF tid IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;

  IF NOT (public.is_privileged_context() OR public.can_access_tenant(tid)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DROP TABLE IF EXISTS pg_temp.ironing_loads;
  CREATE TEMP TABLE ironing_loads ON COMMIT DROP AS
  SELECT
    pe.employee_id,
    pe.full_name,
    pe.check_in_at,
    0::integer AS open_pieces,
    COALESCE(done.done_pieces, 0)::integer AS done_pieces,
    COALESCE(done.done_value, 0)::numeric AS done_value,
    COALESCE(done.done_pieces, 0) * 100 + COALESCE(done.done_value, 0) * 0.7 AS score
  FROM public.present_ironing_employees(tid, bid) pe
  LEFT JOIN LATERAL (
    SELECT COUNT(su.id)::int AS done_pieces,
           COALESCE(SUM(COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0)),0)::numeric AS done_value
    FROM public.service_units su
    WHERE su.assigned_ironing_employee_id = pe.employee_id
      AND su.ironing_completed_at::date = CURRENT_DATE
  ) done ON true;

  SELECT count(*) INTO emp_count FROM pg_temp.ironing_loads;

  UPDATE public.service_units su
  SET assigned_ironing_employee_id = NULL,
      ironing_assigned_at = NULL,
      updated_at = now()
  FROM public.orders o
  WHERE o.id = su.order_id
    AND o.tenant_id = tid
    AND (bid IS NULL OR o.branch_id = bid)
    AND (_order_id IS NULL OR o.id = _order_id)
    AND o.status NOT IN ('delivered','cancelled')
    AND su.status <> 'cancelled'
    AND su.current_stage IN ('ironing','ironing_done')
    AND su.ironing_completed_at IS NULL
    AND COALESCE(su.needs_reclean,false) = false
    AND su.service_type IN ('cleaning','ironing','both');

  IF emp_count = 0 THEN
    RETURN jsonb_build_object('assigned', 0, 'employees', 0, 'message', 'لا يوجد فني كي حاضر الآن');
  END IF;

  FOR u IN
    SELECT su.id,
           COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0)::numeric AS val,
           COALESCE(su.is_shirt_like,false) AS shirt_like
    FROM public.service_units su
    JOIN public.orders o ON o.id = su.order_id
    WHERE o.tenant_id = tid
      AND (bid IS NULL OR o.branch_id = bid)
      AND (_order_id IS NULL OR o.id = _order_id)
      AND o.status NOT IN ('delivered','cancelled')
      AND su.status <> 'cancelled'
      AND su.current_stage IN ('ironing','ironing_done')
      AND su.ironing_completed_at IS NULL
      AND COALESCE(su.needs_reclean,false) = false
      AND su.service_type IN ('cleaning','ironing','both')
      AND su.assigned_ironing_employee_id IS NULL
    ORDER BY (CASE WHEN COALESCE(su.is_shirt_like,false) THEN 1000 ELSE 0 END) + COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0) DESC,
             su.created_at
  LOOP
    SELECT employee_id INTO chosen
    FROM pg_temp.ironing_loads
    ORDER BY score, done_pieces + open_pieces, check_in_at NULLS LAST
    LIMIT 1;

    UPDATE public.service_units
    SET assigned_ironing_employee_id = chosen,
        ironing_assigned_at = now(),
        updated_at = now()
    WHERE id = u.id;

    UPDATE pg_temp.ironing_loads
    SET open_pieces = open_pieces + 1,
        score = score + 100 + (CASE WHEN u.shirt_like THEN 65 ELSE 0 END) + (u.val * 0.7)
    WHERE employee_id = chosen;

    assigned_count := assigned_count + 1;
  END LOOP;

  RETURN jsonb_build_object('assigned', assigned_count, 'employees', emp_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rebalance_ironing_assignments(uuid,uuid,uuid) TO authenticated;
