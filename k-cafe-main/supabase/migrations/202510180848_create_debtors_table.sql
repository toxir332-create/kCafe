-- Debtors table used by DebtorsPage.tsx
create table if not exists public.debtors (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid,
  created_by uuid,
  name text not null,
  phone text,
  amount numeric not null default 0,
  due_date date,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_debtors_restaurant on public.debtors(restaurant_id);
create index if not exists idx_debtors_paid on public.debtors(paid);
create index if not exists idx_debtors_created_at on public.debtors(created_at desc);

alter table public.debtors enable row level security;

-- Minimal permissive policies (adjust later if needed)
create policy if not exists debtors_select on public.debtors
  for select to authenticated using (true);

create policy if not exists debtors_insert on public.debtors
  for insert to authenticated with check (true);

create policy if not exists debtors_update on public.debtors
  for update to authenticated using (true) with check (true);

create policy if not exists debtors_delete on public.debtors
  for delete to authenticated using (true);
