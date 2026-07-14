
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'cs_manager', 'ops_manager', 'courier');
CREATE TYPE public.order_status AS ENUM ('received', 'cleaning', 'ironing', 'packing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid');
CREATE TYPE public.payment_method AS ENUM ('cash', 'instapay', 'cod_cash', 'cod_instapay');
CREATE TYPE public.order_type AS ENUM ('walk_in', 'delivery');
CREATE TYPE public.service_type AS ENUM ('cleaning', 'ironing', 'both');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  -- First user becomes owner
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS profiles
CREATE POLICY "profiles_select_staff" ON public.profiles FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);
CREATE POLICY "profiles_update_owner" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS user_roles
CREATE POLICY "user_roles_select_self" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "user_roles_owner_all" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- ============ APP SETTINGS ============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name TEXT NOT NULL DEFAULT 'مغسلة',
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  urgent_service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id) VALUES (1);

CREATE POLICY "settings_read_staff" ON public.app_settings FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "settings_write_owner" ON public.app_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "customers_staff_all" ON public.customers FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ============ SERVICE CATALOG ============
CREATE TABLE public.service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_type public.service_type NOT NULL DEFAULT 'both',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_read_staff" ON public.service_items FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "service_write_managers" ON public.service_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cs_manager'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cs_manager'));

-- ============ ORDERS ============
CREATE SEQUENCE public.order_number_seq START 1001;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INT NOT NULL DEFAULT nextval('public.order_number_seq') UNIQUE,
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_type public.order_type NOT NULL DEFAULT 'walk_in',
  status public.order_status NOT NULL DEFAULT 'received',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method public.payment_method,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_test BOOLEAN NOT NULL DEFAULT false,

  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  urgent_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,

  pickup_address TEXT,
  delivery_address TEXT,
  pickup_at TIMESTAMPTZ,
  promised_delivery_at TIMESTAMPTZ,
  customer_chosen_delivery_at TIMESTAMPTZ,

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "orders_staff_select" ON public.orders FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "orders_cs_insert" ON public.orders FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'cs_manager') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "orders_managers_update" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'cs_manager') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "orders_owner_delete" ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_item_id UUID REFERENCES public.service_items(id),
  name TEXT NOT NULL,
  service_type public.service_type NOT NULL DEFAULT 'both',
  qty INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_staff_all" ON public.order_items FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ============ ORDER STATUS HISTORY ============
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  technician_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX osh_order_idx ON public.order_status_history(order_id);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "osh_staff_select" ON public.order_status_history FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "osh_staff_insert" ON public.order_status_history FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- ============ TECHNICIANS (simple list managed by ops) ============
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  station public.service_type NOT NULL DEFAULT 'both',
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tech_read_staff" ON public.technicians FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "tech_write_managers" ON public.technicians FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'ops_manager'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'ops_manager'));

-- ============ PUBLIC TRACKING VIEW via security definer ============
-- Customers without auth use a token to fetch order details.
CREATE OR REPLACE FUNCTION public.get_order_by_token(_token UUID)
RETURNS TABLE (
  order_number INT,
  status public.order_status,
  payment_status public.payment_status,
  total NUMERIC,
  is_urgent BOOLEAN,
  pickup_at TIMESTAMPTZ,
  promised_delivery_at TIMESTAMPTZ,
  customer_chosen_delivery_at TIMESTAMPTZ,
  customer_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.order_number, o.status, o.payment_status, o.total, o.is_urgent,
         o.pickup_at, o.promised_delivery_at, o.customer_chosen_delivery_at,
         c.full_name, o.created_at
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE o.public_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_order_items_by_token(_token UUID)
RETURNS TABLE (name TEXT, qty INT, unit_price NUMERIC, line_total NUMERIC)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oi.name, oi.qty, oi.unit_price, oi.line_total
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.public_token = _token
  ORDER BY oi.created_at;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_delivery_choice(_token UUID, _chosen TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET customer_chosen_delivery_at = _chosen WHERE public_token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_items_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_customer_delivery_choice(UUID, TIMESTAMPTZ) TO anon, authenticated;
