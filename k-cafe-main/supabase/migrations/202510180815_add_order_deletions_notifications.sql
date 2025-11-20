-- Create table to log deleted checks
create table if not exists public.order_deletions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  restaurant_id uuid,
  deleted_by_id uuid,
  deleted_by_name text,
  total_amount numeric,
  payment_method text,
  completed_at timestamptz,
  created_at timestamptz,
  items jsonb,
  reason text,
  deleted_at timestamptz not null default now()
);

create index if not exists idx_order_deletions_restaurant on public.order_deletions(restaurant_id);
create index if not exists idx_order_deletions_deleted_at on public.order_deletions(deleted_at desc);

-- Create simple notifications table for boss/admin
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid,
  type text not null,
  title text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notifications_restaurant on public.admin_notifications(restaurant_id);
create index if not exists idx_admin_notifications_created_at on public.admin_notifications(created_at desc);

-- RLS (adjust as needed for your security model)
alter table public.order_deletions enable row level security;
alter table public.admin_notifications enable row level security;

-- Allow authenticated users to insert logs/notifications (scoped by app logic to restaurant_id)
create policy if not exists order_deletions_insert on public.order_deletions
  for insert to authenticated
  with check (true);

create policy if not exists admin_notifications_insert on public.admin_notifications
  for insert to authenticated
  with check (true);

-- Optional: allow owners to read their restaurant logs/notifications
create policy if not exists order_deletions_select on public.order_deletions
  for select to authenticated
  using (true);

create policy if not exists admin_notifications_select on public.admin_notifications
  for select to authenticated
  using (true);
