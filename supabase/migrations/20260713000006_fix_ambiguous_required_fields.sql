-- Fix ambiguous required_fields variable in validate_transition_v2

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
  v_condition jsonb;
  v_required_fields jsonb;
  v_missing_fields text[];
  v_field text;
  v_required_role text;
BEGIN
  SELECT * INTO wo FROM work_orders WHERE id = _work_order_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Work order not found');
  END IF;

  v_from_stage_id := wo.current_stage_id;

  SELECT * INTO transition
  FROM workflow_transitions
  WHERE workflow_id = wo.workflow_id
    AND (workflow_transitions.from_stage_id IS NULL OR workflow_transitions.from_stage_id = wo.current_stage_id)
    AND to_stage_id = _to_stage_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Transition not allowed from current stage');
  END IF;

  v_condition := transition.condition_json;

  IF (v_condition->>'requires_photo')::boolean = true THEN
    IF NOT (wo.custom_fields ? 'photo_url') AND NOT EXISTS (SELECT 1 FROM service_units su WHERE su.order_id::text = wo.custom_fields->>'order_id' AND su.photo_url IS NOT NULL) THEN
      RETURN jsonb_build_object('ok', false, 'message', 'صورة مطلوبة قبل الانتقال لهذه المرحلة');
    END IF;
  END IF;

  IF v_condition ? 'requires_fields' THEN
    SELECT array_agg(f) INTO v_missing_fields
    FROM jsonb_array_elements_text(v_condition->'requires_fields') AS f
    WHERE NOT (wo.custom_fields ? f);

    IF array_length(v_missing_fields, 1) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'message', 'حقول مطلوبة ناقصة: ' || array_to_string(v_missing_fields, ', '));
    END IF;
  END IF;

  SELECT workflow_stages_v2.required_fields, workflow_stages_v2.required_role INTO v_required_fields, v_required_role
  FROM workflow_stages_v2 WHERE id = _to_stage_id;

  RETURN jsonb_build_object('ok', true, 'message', '', 'transition_id', transition.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_transition_v2(uuid, uuid, uuid) TO authenticated;
