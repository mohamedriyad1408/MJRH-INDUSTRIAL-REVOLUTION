-- Fix ambiguous from_stage_id variable in validate_transition_v2 (was causing "column reference from_stage_id is ambiguous")

CREATE OR REPLACE FUNCTION public.validate_transition_v2(
  _tenant_id uuid,
  _work_order_id uuid,
  _to_stage_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wo RECORD;
  v_from_stage_id uuid;
  transition RECORD;
  condition jsonb;
  required_fields jsonb;
  missing_fields text[];
  field text;
BEGIN
  SELECT * INTO wo FROM work_orders WHERE id = _work_order_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Work order not found');
  END IF;

  v_from_stage_id := wo.current_stage_id;

  -- Find allowed transition (qualified to avoid ambiguous)
  SELECT * INTO transition
  FROM workflow_transitions
  WHERE workflow_id = wo.workflow_id
    AND (workflow_transitions.from_stage_id IS NULL OR workflow_transitions.from_stage_id = wo.current_stage_id)
    AND to_stage_id = _to_stage_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Transition not allowed from current stage');
  END IF;

  condition := transition.condition_json;

  IF (condition->>'requires_photo')::boolean = true THEN
    IF NOT (wo.custom_fields ? 'photo_url') AND NOT EXISTS (SELECT 1 FROM service_units su WHERE su.order_id::text = wo.custom_fields->>'order_id' AND su.photo_url IS NOT NULL) THEN
      RETURN jsonb_build_object('ok', false, 'message', 'صورة مطلوبة قبل الانتقال لهذه المرحلة');
    END IF;
  END IF;

  IF condition ? 'requires_fields' THEN
    SELECT array_agg(f) INTO missing_fields
    FROM jsonb_array_elements_text(condition->'requires_fields') AS f
    WHERE NOT (wo.custom_fields ? f);

    IF array_length(missing_fields, 1) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'message', 'حقول مطلوبة ناقصة: ' || array_to_string(missing_fields, ', '));
    END IF;
  END IF;

  SELECT required_fields, required_role INTO required_fields, field
  FROM workflow_stages_v2 WHERE id = _to_stage_id;

  RETURN jsonb_build_object('ok', true, 'message', '', 'transition_id', transition.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_transition_v2(uuid, uuid, uuid) TO authenticated;
