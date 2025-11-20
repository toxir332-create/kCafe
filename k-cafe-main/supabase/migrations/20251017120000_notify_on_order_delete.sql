/*
  # Notify boss when an order (receipt) is deleted
  - Ensures notifications table exists
  - Adds trigger to insert notification after delete on orders
*/

-- 1) Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- e.g. 'order_deleted'
  title text,
  message text,
  order_id uuid,
  deleted_by uuid,
  amount numeric(12,2),
  restaurant_id uuid,
  recipient_role text default 'boss', -- who should see this
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_type_idx on public.notifications(type);
create index if not exists notifications_recipient_role_idx on public.notifications(recipient_role);

alter table public.notifications enable row level security;

-- simple authenticated policies (tighten later if needed)
create policy if not exists "Authenticated can view notifications"
  on public.notifications for select
  to authenticated
  using (true);

create policy if not exists "Authenticated can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- 2) Trigger function
create or replace function public.notify_order_delete()
returns trigger as $$
begin
  insert into public.notifications(type, title, message, order_id, deleted_by, amount, restaurant_id, recipient_role)
  values (
    'order_deleted',
    'Chek o\'chirildi',
    coalesce('Chek #' || old.id || ' o\'chirildi. Summasi: ' || coalesce(old.total_amount::text,'0'), 'Chek o\'chirildi'),
    old.id,
    auth.uid(),
    old.total_amount,
    coalesce(old.table_id, null), -- adjust if you store restaurant_id elsewhere
    'boss'
  );
  return null;
end;
$$ language plpgsql security definer;

-- 3) Trigger on orders delete
create trigger trg_notify_order_delete
after delete on public.orders
for each row execute function public.notify_order_delete();

-- 4) Ensure PostgREST reloads
notify pgrst, 'reload schema';
