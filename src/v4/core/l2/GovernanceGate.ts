import { supabase } from "@/integrations/supabase/client";

export type DecisionType = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'REQUIRE_ESCALATION';

export interface GovernanceDecision {
    decision: DecisionType;
    reason: string;
    matched_policy_id?: string;
    matched_mandate_id?: string;
    sovereign_id?: string;
    eval_at?: string;
}

export class GovernanceGate {
    async evaluate(actorId: string, nodeId: string, action: string, resourceClass: string): Promise<GovernanceDecision> {
        const { data, error } = await supabase.rpc('fn_evaluate_governance', {
            _actor_id: actorId,
            _target_node_id: nodeId,
            _action: action,
            _resource_class: resourceClass
        });

        if (error || !data) throw new Error("GOVERNANCE_ENGINE_ERROR");
        return data as GovernanceDecision;
    }
}
