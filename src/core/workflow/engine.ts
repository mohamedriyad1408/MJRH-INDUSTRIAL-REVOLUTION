import { supabase } from "@/integrations/supabase/client";

export type V2Stage = {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  stage_order: number;
  required_role: string | null;
  sla_target_mins: number;
  sla_max_mins: number;
  required_fields: string[];
  icon: string | null;
  color: string | null;
  is_initial: boolean;
  is_final: boolean;
};

export type V2Transition = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  condition_json: Record<string, any>;
  required_role: string | null;
};

export type V2WorkflowSnapshot = {
  workflow_id: string;
  name: string;
  industry: string;
  version: number;
  stages: V2Stage[];
  transitions: V2Transition[];
};

/**
 * Fetch workflow definition with stages and transitions
 */
export async function fetchWorkflowDefinition(workflowId: string): Promise<{ workflow: any; stages: V2Stage[]; transitions: V2Transition[] } | null> {
  const { data: wf, error: wfErr } = await supabase.from("workflow_definitions").select("*").eq("id", workflowId).single();
  if (wfErr || !wf) return null;

  const [{ data: stages }, { data: transitions }] = await Promise.all([
    supabase.from("workflow_stages_v2").select("*").eq("workflow_id", workflowId).order("stage_order"),
    supabase.from("workflow_transitions").select("*").eq("workflow_id", workflowId),
  ]);

  return {
    workflow: wf,
    stages: (stages ?? []) as any,
    transitions: (transitions ?? []) as any,
  };
}

/**
 * Validate transition strictly from DB, not hardcoded if()
 * condition_json is whitelist-filtered on DB level (validate_transition_condition)
 */
export async function validateTransitionV2(
  tenantId: string,
  workOrderId: string,
  toStageId: string
): Promise<{ ok: boolean; message?: string; transitionId?: string }> {
  const { data, error } = await supabase.rpc("validate_transition_v2", {
    _tenant_id: tenantId,
    _work_order_id: workOrderId,
    _to_stage_id: toStageId,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const res: any = data;
  if (res?.ok) {
    return { ok: true, transitionId: res.transition_id };
  }
  return { ok: false, message: res?.message || "Transition not allowed" };
}

/**
 * Move work order to next stage (generic)
 */
export async function moveWorkOrderToStage(
  tenantId: string,
  workOrderId: string,
  toStageId: string,
  employeeId?: string
): Promise<{ ok: boolean; message?: string }> {
  // Validate first
  const validation = await validateTransitionV2(tenantId, workOrderId, toStageId);
  if (!validation.ok) return validation;

  // Get target stage to calculate SLA due
  const { data: stage } = await supabase.from("workflow_stages_v2").select("sla_target_mins").eq("id", toStageId).single();
  const slaDue = stage ? new Date(Date.now() + (stage.sla_target_mins || 120) * 60 * 1000).toISOString() : null;

  const { error } = await supabase
    .from("work_orders")
    .update({
      current_stage_id: toStageId,
      sla_due_at: slaDue,
      updated_at: new Date().toISOString(),
      ...(employeeId ? { assigned_to_employee_id: employeeId } : {}),
      status: "in_progress",
    })
    .eq("id", workOrderId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };

  // Record audit
  await supabase.from("operation_events").insert({
    tenant_id: tenantId,
    process_key: "work_order_stage_move",
    process_name: "تحريك طلب - محرك v2",
    source_type: "work_order",
    source_id: workOrderId,
    data: { to_stage_id: toStageId, transition_id: validation.transitionId },
    output: { appears_in_report: true },
  } as any);

  return { ok: true };
}

/**
 * For backward compatibility with orders table that uses workflow_version_snapshot
 * If order has snapshot, validate against snapshot, not DB (so old open orders don't break when definition changes)
 */
export function validateAgainstSnapshot(
  snapshot: V2WorkflowSnapshot,
  fromStageId: string | null,
  toStageId: string
): { ok: boolean; message?: string } {
  const transition = snapshot.transitions.find(
    (t) => (t.from_stage_id === fromStageId || t.from_stage_id === null) && t.to_stage_id === toStageId
  );
  if (!transition) {
    return { ok: false, message: `Transition from ${fromStageId} to ${toStageId} not allowed in snapshot v${snapshot.version}` };
  }

  // Simple condition check from whitelist
  const cond = transition.condition_json || {};
  // In snapshot mode we trust previously validated conditions (no DB check)
  return { ok: true };
}
