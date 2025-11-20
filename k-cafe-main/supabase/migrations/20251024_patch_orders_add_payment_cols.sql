-- Patch: align frontend expectations with backend schema
-- Add missing columns to orders used by UI
alter table public.orders
  add column if not exists waiter_id uuid,
  add column if not exists payment_method text,
  add column if not exists payment_status text;
