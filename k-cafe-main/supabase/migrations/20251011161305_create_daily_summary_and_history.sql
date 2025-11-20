/*
  # Create Daily Summary and History Tables

  1. New Tables
    - `daily_summaries`
      - `id` (uuid, primary key)
      - `restaurant_id` (text) - Restaurant identifier
      - `date` (date) - Business date
      - `total_sales` (decimal) - Total sales for the day
      - `total_orders` (integer) - Number of orders
      - `total_customers` (integer) - Number of customers served
      - `cash_payments` (decimal) - Cash payment total
      - `card_payments` (decimal) - Card payment total
      - `qr_payments` (decimal) - QR code payment total
      - `created_at` (timestamptz)
    
    - `restaurant_settings`
      - `id` (uuid, primary key)
      - `restaurant_id` (text, unique) - Restaurant identifier
      - `restaurant_name` (text) - Restaurant name
      - `currency` (text) - Currency code (UZS)
      - `tax_rate` (decimal) - Tax rate percentage
      - `service_charge` (decimal) - Service charge percentage
      - `daily_reset_time` (time) - Time to reset daily data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create daily_summaries table
CREATE TABLE IF NOT EXISTS daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_sales decimal(12,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  total_customers integer NOT NULL DEFAULT 0,
  cash_payments decimal(12,2) NOT NULL DEFAULT 0,
  card_payments decimal(12,2) NOT NULL DEFAULT 0,
  qr_payments decimal(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, date)
);

-- Create restaurant_settings table
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text UNIQUE NOT NULL,
  restaurant_name text NOT NULL DEFAULT 'Mening Restoranim',
  currency text NOT NULL DEFAULT 'UZS',
  tax_rate decimal(5,2) DEFAULT 0,
  service_charge decimal(5,2) DEFAULT 0,
  daily_reset_time time DEFAULT '00:00:00',
  address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS daily_summaries_restaurant_date_idx ON daily_summaries(restaurant_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_summaries_date_idx ON daily_summaries(date DESC);

-- Enable Row Level Security
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_summaries
CREATE POLICY "Authenticated users can view daily summaries"
  ON daily_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily summaries"
  ON daily_summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily summaries"
  ON daily_summaries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for restaurant_settings
CREATE POLICY "Authenticated users can view restaurant settings"
  ON restaurant_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert restaurant settings"
  ON restaurant_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update restaurant settings"
  ON restaurant_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on restaurant_settings
DROP TRIGGER IF EXISTS update_restaurant_settings_updated_at ON restaurant_settings;
CREATE TRIGGER update_restaurant_settings_updated_at
  BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
