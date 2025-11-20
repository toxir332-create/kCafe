-- Ensure orders has restaurant_id for scoping and audits
alter table if exists public.orders
  add column if not exists restaurant_id uuid;

create index if not exists idx_orders_restaurant on public.orders(restaurant_id);
