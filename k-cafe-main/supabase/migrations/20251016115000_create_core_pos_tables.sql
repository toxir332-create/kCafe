/*
  # Create Core POS Tables
  This migration creates tables required by the app that may be missing in your Supabase project.
  Tables: restaurant_settings, tables, orders, order_items, staff, wage_payments, expenses, notifications
*/

-- restaurant_settings
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL DEFAULT 'My Restaurant',
  currency text NOT NULL DEFAULT 'UZS',
  tax_rate numeric(5,2),
  service_charge numeric(5,2),
  daily_reset_time text,
  address text,
  phone text,
  email text,
  owner_card_number text,
  owner_qr_url text,
  restaurant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- tables (restaurant tables)
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  seats integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'available',
  current_order uuid,
  reserved_by text,
  reservation_time timestamptz,
  restaurant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tables_number_idx ON public.tables(number);

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid,
  waiter_id uuid,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS orders_table_id_idx ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  menu_item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  special_requests text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

-- staff
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  login text NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'waiter',
  daily_wage numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_login_unique ON public.staff(login);

-- wage_payments
CREATE TABLE IF NOT EXISTS public.wage_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  paid_date date DEFAULT (CURRENT_DATE),
  note text,
  paid_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wage_payments_staff_id_idx ON public.wage_payments(staff_id);

-- expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  expense_date date DEFAULT (CURRENT_DATE),
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses(expense_date);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  message text NOT NULL,
  created_by uuid,
  visible_to text NOT NULL DEFAULT 'all',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wage_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Basic policies for authenticated role
DO $$
BEGIN
  -- helper to create or ignore duplicate policy errors
  PERFORM 1;
END $$;

-- restaurant_settings
CREATE POLICY IF NOT EXISTS "auth select restaurant_settings" ON public.restaurant_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert restaurant_settings" ON public.restaurant_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update restaurant_settings" ON public.restaurant_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete restaurant_settings" ON public.restaurant_settings FOR DELETE TO authenticated USING (true);

-- tables
CREATE POLICY IF NOT EXISTS "auth select tables" ON public.tables FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert tables" ON public.tables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update tables" ON public.tables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete tables" ON public.tables FOR DELETE TO authenticated USING (true);

-- orders
CREATE POLICY IF NOT EXISTS "auth select orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update orders" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

-- order_items
CREATE POLICY IF NOT EXISTS "auth select order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update order_items" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete order_items" ON public.order_items FOR DELETE TO authenticated USING (true);

-- staff
CREATE POLICY IF NOT EXISTS "auth select staff" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update staff" ON public.staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete staff" ON public.staff FOR DELETE TO authenticated USING (true);

-- wage_payments
CREATE POLICY IF NOT EXISTS "auth select wage_payments" ON public.wage_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert wage_payments" ON public.wage_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update wage_payments" ON public.wage_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete wage_payments" ON public.wage_payments FOR DELETE TO authenticated USING (true);

-- expenses
CREATE POLICY IF NOT EXISTS "auth select expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

-- notifications
CREATE POLICY IF NOT EXISTS "auth select notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth delete notifications" ON public.notifications FOR DELETE TO authenticated USING (true);

-- Finally, ask PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
