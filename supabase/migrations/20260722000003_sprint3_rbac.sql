-- ============================================
-- T-013: RBAC (Roles & Permissions)
-- ============================================

-- 1. إضافة عمود role في جدول profiles (since it's common in Supabase to use profiles for users)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'staff';
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'manager', 'supervisor', 'staff', 'driver', 'super_admin'));
  END IF;
END $$;

-- 2. إنشاء جدول الأدوار (للإشارة)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. إضافة الأدوار الأساسية
INSERT INTO public.roles (name, description, permissions)
VALUES
    ('owner', 'المالك - أعلى صلاحية', '["*"]'),
    ('manager', 'المدير - إدارة العمليات والموظفين', '["orders.read", "orders.write", "employees.read", "employees.write", "reports.read"]'),
    ('supervisor', 'المشرف - إدارة المهام اليومية', '["orders.read", "orders.update_status", "qc.read", "qc.write"]'),
    ('staff', 'الموظف - تنفيذ المهام', '["orders.read", "orders.update_status"]'),
    ('driver', 'المندوب - التوصيل', '["orders.read", "orders.deliver"]')
ON CONFLICT (name) DO NOTHING;

-- 4. تحديث جدول profiles بإضافة tenant_id إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. إنشاء دالة للتحقق من الصلاحية
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_permissions JSONB;
BEGIN
    -- جلب دور المستخدم
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_id;

    -- owner و super_admin لديهم جميع الصلاحيات
    IF user_role IN ('owner', 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- جلب صلاحيات الدور
    SELECT permissions INTO user_permissions
    FROM public.roles
    WHERE name = user_role;

    -- التحقق من الصلاحية
    RETURN user_permissions ? required_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
