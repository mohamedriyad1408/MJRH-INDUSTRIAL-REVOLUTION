import { supabase } from "@/integrations/supabase/client";

export class LegalService {
    static async getChainOfCommand(positionId: string) {
        const { data, error } = await supabase.rpc('resolve_chain_of_command', { _position_id: positionId });
        if (error) throw error;
        return data;
    }
}
