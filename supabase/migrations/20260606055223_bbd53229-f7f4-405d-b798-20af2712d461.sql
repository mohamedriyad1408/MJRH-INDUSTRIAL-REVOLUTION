
-- Re-grant EXECUTE on RLS helper functions to authenticated role.
-- Without these, RLS policies that reference them can fail to evaluate
-- and queries return empty results, breaking role-based UI gating.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
