import { supabase } from "@/integrations/supabase/client";

/**
 * PulseGate — Layer 4 Runtime Orchestrator
 * Responsibility: Execute state transitions in the Value Stream.
 * Constraint: Must survive L2 governance and L3 readiness checks.
 */
export class PulseGate {
  /**
   * Instantiates a new Work Order (Job).
   * Orchestrates L1 node anchoring and L2 actor context.
   */
  static async provisionJob(nodeId: string, streamId: string, payload: any = {}) {
    const { data, error } = await supabase.rpc("rpc_provision_job", {
      _node_id: nodeId,
      _stream_id: streamId,
      _payload: payload,
    });

    if (error) throw new Error(`[L4_PROVISION_FAIL]: ${error.message}`);
    return data;
  }

  /**
   * Executes a "Pulse" (State Transition).
   * Triggers synchronous L2 mandate validation and L3 readiness certification.
   */
  static async pulseJob(jobId: string, targetActivityId: string, payload: any = {}) {
    const { data, error } = await supabase.rpc("rpc_pulse_job", {
      _job_id: jobId,
      _target_activity_id: targetActivityId,
      _payload: payload,
    });

    if (error) throw new Error(`[L4_PULSE_FAIL]: ${error.message}`);
    
    const result = data as { ok: boolean; reason?: string; details?: any };
    if (!result.ok) {
      console.warn(`[L4_PULSE_BLOCKED]: ${result.reason}`, result.details);
    }
    
    return result;
  }
}
