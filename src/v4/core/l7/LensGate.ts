import { supabase } from "@/integrations/supabase/client";

/**
 * LensGate — Layer 7 Dynamic Interface Orchestrator
 * Responsibility: Project the OS metadata into UI-consumable bundles.
 * Rule: The UI is a Stateless Mirror of the OS Logic.
 */
export class LensGate {
  /**
   * Fetches the entire application context for an actor.
   * Includes dynamic navigation, mandates, and branding.
   */
  static async getAppContext(workOrderId?: string) {
    const { data, error } = await supabase.rpc("rpc_get_app_context", {
      _work_order_id: workOrderId,
    });

    if (error) throw new Error(`[L7_LENS_ERROR]: ${error.message}`);
    return data as AppContext;
  }

  /**
   * Resolves only the metadata for a specific Work Order activity.
   */
  static async getActivityMeta(workOrderId: string, actorId: string) {
    const { data, error } = await supabase.rpc("fn_v_get_ui_metadata", {
      _work_order_id: workOrderId,
      _actor_id: actorId,
    });

    if (error) throw new Error(`[L7_ACTIVITY_ERROR]: ${error.message}`);
    return data;
  }
}

export interface AppContext {
  actor_id: string;
  navigation: NavItem[];
  active_context?: any;
  system_time: string;
}

export interface NavItem {
  id: string;
  activity_name: string;
  stream_name: string;
  icon: string;
  route: string;
}
