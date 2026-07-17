
-- ============================================================
-- 1) مسح كل البيانات التشغيلية والمستخدمين
-- ============================================================
TRUNCATE
  public.order_status_history,
  public.order_items,
  public.orders,
  public.advance_requests,
  public.leave_requests,
  public.holidays,
  public.work_schedules,
  public.expenses,
  public.employees,
  public.technicians,
  public.customers,
  public.service_items,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;
ALTER SEQUENCE public.order_number_seq RESTART WITH 1;

-- ============================================================
-- 2) إسقاط كل السياسات والدوال القديمة المعتمدة على app_role
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff(uuid) CASCADE;

-- ============================================================
-- 3) توسيع enum app_role
-- ============================================================
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;
ALTER TABLE public.employees  ALTER COLUMN role TYPE text;
DROP TYPE IF EXISTS public.app_role;
CREATE TYPE public.app_role AS ENUM (
  'super_admin','owner','cs_manager','ops_manager','employee','customer','courier'
);
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;
ALTER TABLE public.employees  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- ============================================================
-- 4) جدول المغاسل (tenants)
-- ============================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5) إضافة tenant_id لكل الجداول التشغيلية + user_roles
-- ============================================================
ALTER TABLE public.user_roles           ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.customers            ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.orders               ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items          ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.order_status_history ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.service_items        ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.employees            ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.work_schedules       ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests       ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.holidays             ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.advance_requests     ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.expenses             ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.technicians          ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- مستخدم له دور+مغسلة فريد
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique
  ON public.user_roles(user_id, role, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================
-- 6) إعادة بناء app_settings لتكون per-tenant
-- ============================================================
DROP TABLE IF EXISTS public.app_settings CASCADE;
CREATE TABLE public.app_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT 'مغسلة',
  currency text NOT NULL DEFAULT 'EGP',
  urgent_service_fee numeric NOT NULL DEFAULT 0,
  default_delivery_fee numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7) الدوال المساعدة
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id)
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _tenant_id IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR public.is_tenant_member(auth.uid(), _tenant_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_manager(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
      AND role IN ('owner','cs_manager','ops_manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role <> 'customer'
  )
$$;

-- ============================================================
-- 8) أول مستخدم بعد المسح = super_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (NEW.id, 'super_admin', NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9) سياسات RLS الجديدة
-- ============================================================

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_update_super ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'owner'))
  );
CREATE POLICY user_roles_super_all ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY user_roles_owner_manage ON public.user_roles FOR ALL TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'owner')
    AND role NOT IN ('super_admin','owner')
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'owner')
    AND role NOT IN ('super_admin','owner')
  );

-- tenants
CREATE POLICY tenants_super_all ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY tenants_member_select ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), id));
CREATE POLICY tenants_owner_update ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_tenant_role(auth.uid(), id, 'owner'));

-- app_settings (per tenant)
CREATE POLICY settings_select ON public.app_settings FOR SELECT TO authenticated
  USING (public.can_access_tenant(tenant_id));
CREATE POLICY settings_update_owner ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));
CREATE POLICY settings_insert_super ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- customers / service_items / employees / work_schedules / leave_requests /
-- holidays / advance_requests / expenses / technicians / orders / order_items /
-- order_status_history → كل الوصول مشروط بالـ tenant
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','service_items','employees','work_schedules',
    'leave_requests','holidays','advance_requests','expenses',
    'technicians','orders','order_items','order_status_history'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (public.can_access_tenant(tenant_id))
         WITH CHECK (public.can_access_tenant(tenant_id))',
      t || '_tenant_all', t
    );
  END LOOP;
END $$;

-- منع حذف الطلبات إلا من المالك أو super_admin (سياسة إضافية أكثر تقييداً)
CREATE POLICY orders_delete_owner ON public.orders FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), tenant_id, 'owner')
  );
