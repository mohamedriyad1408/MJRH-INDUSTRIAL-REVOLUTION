/**
 * MJRH — Admin API Client (V4 Sovereign Bridge Edition)
 * Provides centralized administration capabilities via V4 RPCs.
 */
import { supabase } from "@/integrations/supabase/client";

export const adminApi = {
  // V4 Sovereign Launch
  launchEnterprise: async (p: { 
    name: string; 
    slug: string; 
    ownerEmail: string; 
    ownerPassword: string; 
    ownerFullName: string; 
    businessType: string;
    primaryLang?: string;
  }) => {
    const { data: payload, error: genError } = await supabase.rpc('generate_payload_from_industry', {
        _business_type: p.businessType,
        _org_name: p.name,
        _slug: p.slug,
        _primary_lang: p.primaryLang || 'ar'
    });

    if (genError) throw genError;

    const { data, error } = await supabase.rpc('launch_enterprise', {
        _payload: payload,
        _owner_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
    return { tenant_id: data };
  },

  listAllUsers: async () => {
    const { data, error } = await supabase.from('v4_l2.actors' as any).select('*, identities(*)');
    if (error) throw error;
    return { users: data || [] };
  },

  // Missing methods for UI compatibility
  createTenantUser: async (p: any) => {
    console.log("MOCK: Creating V4 Actor for", p.email);
    const { data, error } = await supabase.from('v4_l2.actors' as any).insert({
      identity_id: (await supabase.auth.getUser()).data.user?.id, // Mock
      type: 'HUMAN',
      sovereign_root_id: p.tenantId
    }).select().single();
    if (error) throw error;
    return { user_id: data.id };
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('v4_l2.actors' as any).delete().eq('id', userId);
    if (error) throw error;
    return { ok: true };
  },

  resetUserPassword: async (userId: string, _newPass: string) => {
    console.log("MOCK: Reseting password for", userId);
    return { ok: true };
  },

  // Legacy compatibility
  createTenant: (p: any) => adminApi.launchEnterprise(p), 
};
