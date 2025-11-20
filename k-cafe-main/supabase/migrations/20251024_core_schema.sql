-- Core schema for kCafe POS
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Restaurants
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Restaurant settings
create table if not exists public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  restaurant_name text not null,
  phone text,
  address text,
  owner_card_number text,
  owner_qr_url text,
  currency text default 'UZS',
  tax_rate numeric default 0,
  service_charge numeric default 0,
  daily_reset_time text default '00:00:00',
  updated_at timestamptz not null default now()
);

-- Tables
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  number int not null,
  seats int not null default 4,
  status text not null default 'available',
  current_order uuid,
  unique(restaurant_id, number)
);

-- Menu
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  current_stock numeric not null default 0,
  min_stock numeric not null default 0,
  unit text,
  last_restocked timestamptz default now(),
  updated_at timestamptz not null default now()
);

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  loyalty_points int not null default 0,
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'open', -- open | closed | void
  total_amount numeric not null default 0,
  special_instructions text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  menu_item_name text not null,
  unit_price numeric not null,
  quantity numeric not null default 1,
  subtotal numeric not null
);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  method text not null, -- cash | card | qr
  amount numeric not null,
  paid_at timestamptz not null default now(),
  ext_ref text, -- idempotency key or external reference
  unique(order_id, ext_ref)
);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  order_id uuid,
  payload jsonb,
  performed_by uuid,
  performed_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_orders_restaurant on public.orders(restaurant_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_payments_order on public.payments(order_id);

-- RLS enable
alter table public.restaurant_settings enable row level security;
alter table public.tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

-- Permissive policies for now (tighten later)
create policy if not exists select_all_settings on public.restaurant_settings for select to authenticated using (true);
create policy if not exists upsert_all_settings on public.restaurant_settings for insert to authenticated with check (true);
create policy if not exists update_all_settings on public.restaurant_settings for update to authenticated using (true);

create policy if not exists select_all_tables on public.tables for select to authenticated using (true);
create policy if not exists modify_all_tables on public.tables for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_menu on public.menu_items for select to authenticated using (true);
create policy if not exists modify_all_menu on public.menu_items for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_inventory on public.inventory for select to authenticated using (true);
create policy if not exists modify_all_inventory on public.inventory for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_customers on public.customers for select to authenticated using (true);
create policy if not exists modify_all_customers on public.customers for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_orders on public.orders for select to authenticated using (true);
create policy if not exists modify_all_orders on public.orders for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_order_items on public.order_items for select to authenticated using (true);
create policy if not exists modify_all_order_items on public.order_items for insert, update to authenticated using (true) with check (true);

create policy if not exists select_all_payments on public.payments for select to authenticated using (true);
create policy if not exists modify_all_payments on public.payments for insert, update to authenticated using (true) with check (true);
