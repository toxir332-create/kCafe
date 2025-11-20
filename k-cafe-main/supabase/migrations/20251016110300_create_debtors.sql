/*
  # Create Debtors Table

  1. New Table
    - `debtors`
      - `id` (uuid, primary key)
      - `name` (text)
      - `amount` (numeric)
      - `due_date` (date)
      - `paid` (boolean)
      - `paid_at` (timestamptz)
      - `restaurant_id` (uuid)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can CRUD
*/

CREATE TABLE IF NOT EXISTS debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  restaurant_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debtors_name_idx ON debtors(name);
CREATE INDEX IF NOT EXISTS debtors_due_date_idx ON debtors(due_date);
CREATE INDEX IF NOT EXISTS debtors_paid_idx ON debtors(paid);

ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view debtors"
  ON debtors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert debtors"
  ON debtors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update debtors"
  ON debtors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete debtors"
  ON debtors FOR DELETE
  TO authenticated
  USING (true);
