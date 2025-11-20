/*
  Add staff, wage payments, expenses, and notifications tables
  and extend restaurant_settings for owner payment info.
*/

-- Staff (waiters/managers created by Admin)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  login text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'waiter' CHECK (role IN ('waiter','manager')),
  daily_wage decimal(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Wage payments (daily)
CREATE TABLE IF NOT EXISTS wage_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  paid_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  paid_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wage_payments_staff_date_idx ON wage_payments(staff_id, paid_date);

-- Expenses (daily operational expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount decimal(12,2) NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(expense_date);

-- Manager-only notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  message text NOT NULL,
  created_by text,
  visible_to text NOT NULL DEFAULT 'manager',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_visible_created_idx ON notifications(visible_to, created_at DESC);

-- Extend restaurant_settings with owner payment info
ALTER TABLE IF EXISTS restaurant_settings
  ADD COLUMN IF NOT EXISTS owner_card_number text,
  ADD COLUMN IF NOT EXISTS owner_qr_url text;

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic permissive demo policies (tighten in production)
CREATE POLICY IF NOT EXISTS "Authenticated can read staff"
  ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Admins and managers manage staff"
  ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated can read wage_payments"
  ON wage_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated can insert wage_payments"
  ON wage_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated can read expenses"
  ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Admins and managers manage expenses"
  ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Managers can read notifications"
  ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "System can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- When a paid order is deleted by admin/manager, notify managers
CREATE OR REPLACE FUNCTION notify_paid_order_deleted()
RETURNS TRIGGER AS $$
DECLARE
  msg text;
BEGIN
  IF OLD.payment_status = 'paid' THEN
    msg := 'Admin tomonidan yopilgan buyurtma o\'chirildi: ID=' || OLD.id || ', stol=' || COALESCE(OLD.table_id::text, '-');
    INSERT INTO notifications(type, message, created_by, visible_to)
    VALUES('order_deleted', msg, 'admin', 'manager');
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_paid_order_deleted ON orders;
CREATE TRIGGER trg_notify_paid_order_deleted
  AFTER DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_paid_order_deleted();

-- updated_at trigger for staff
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
