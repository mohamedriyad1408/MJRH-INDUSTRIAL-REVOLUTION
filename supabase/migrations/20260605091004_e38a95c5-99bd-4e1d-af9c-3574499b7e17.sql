
-- 1) Fix app_settings INSERT: force tenant_id server-side via default + verify ownership of derived tenant
DROP POLICY IF EXISTS settings_insert_super ON public.app_settings;
CREATE POLICY settings_insert_super ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (tenant_id = current_tenant_id() AND has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role))
  );

-- 2) Profiles: add explicit INSERT policy restricting to self (super admin allowed too)
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR is_super_admin(auth.uid()));

-- 3) Prevent tenant owners from escalating their OWN role (must not insert/update/delete rows for themselves)
DROP POLICY IF EXISTS user_roles_owner_manage ON public.user_roles;
CREATE POLICY user_roles_owner_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
    AND user_id <> auth.uid()
    AND role <> ALL (ARRAY['super_admin'::app_role, 'owner'::app_role])
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
    AND user_id <> auth.uid()
    AND role <> ALL (ARRAY['super_admin'::app_role, 'owner'::app_role])
  );

-- 4) Lock down SECURITY DEFINER helpers: revoke EXECUTE from anon/authenticated
-- These are only meant to be called from RLS policies / triggers (server-side), not from clients.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_tenant_manager(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_tenant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Public tracking-by-token helpers must remain callable by anon (intentional public access via opaque token)
GRANT EXECUTE ON FUNCTION public.get_order_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_items_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_customer_delivery_choice(uuid, timestamptz) TO anon, authenticated;
