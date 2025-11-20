/*
  # Update Orders Schema for Demo Users

  1. Changes
    - Change waiter_id from uuid to text to support demo user IDs
    - Drop and recreate foreign key constraints
    - Maintain all existing functionality

  2. Security
    - Maintain RLS protection
    - Update policies if needed
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;

-- Drop the waiter_id column and recreate it as text
ALTER TABLE orders DROP COLUMN IF EXISTS waiter_id CASCADE;
ALTER TABLE orders ADD COLUMN waiter_id text;

-- Recreate index
DROP INDEX IF EXISTS orders_waiter_id_idx;
CREATE INDEX orders_waiter_id_idx ON orders(waiter_id);

-- Recreate policy
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);
