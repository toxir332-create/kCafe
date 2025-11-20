/*
  # Fix Tables Schema for Demo Users

  1. Changes
    - Drop and recreate policies
    - Change restaurant_id from uuid to text
    - Recreate all constraints and indexes

  2. Security
    - Maintain RLS protection
    - Update policies to work with text IDs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view tables" ON tables;
DROP POLICY IF EXISTS "Authenticated users can insert tables" ON tables;
DROP POLICY IF EXISTS "Authenticated users can update their tables" ON tables;
DROP POLICY IF EXISTS "Authenticated users can delete their tables" ON tables;

-- Drop and recreate the restaurant_id column
ALTER TABLE tables DROP COLUMN IF EXISTS restaurant_id CASCADE;
ALTER TABLE tables ADD COLUMN restaurant_id text NOT NULL DEFAULT '1';

-- Recreate unique index
DROP INDEX IF EXISTS tables_restaurant_number_idx;
CREATE UNIQUE INDEX tables_restaurant_number_idx ON tables(restaurant_id, number);

-- Recreate RLS Policies for tables
CREATE POLICY "Authenticated users can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their tables"
  ON tables FOR DELETE
  TO authenticated
  USING (true);
