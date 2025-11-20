-- RPC: restore_order_from_deletion
-- Recreate an order and its items from audit snapshot, then optionally remove the audit row.
-- Usage: select public.restore_order_from_deletion(p_order_id => '<uuid>', p_delete_audit => false);

create or replace function public.restore_order_from_deletion(
  p_order_id uuid,
  p_delete_audit boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  new_order_id uuid := gen_random_uuid();
  itm jsonb;
  itm_id uuid;
begin
  select * into a from public.order_deletions where order_id = p_order_id order by deleted_at desc limit 1;
  if not found then
    raise exception 'No audit row for order %', p_order_id using errcode = 'P0002';
  end if;

  -- recreate order
  insert into public.orders (id, table_id, total_amount, payment_method, status, completed_at, created_at, restaurant_id)
  values (
    new_order_id,
    null, -- table unknown in audit; set to null or extend audit schema to include it
    coalesce(a.total_amount, 0),
    a.payment_method,
    'served',
    a.completed_at,
    coalesce(a.created_at, now()),
    a.restaurant_id
  );

  -- recreate items
  if a.items is not null then
    for itm in select jsonb_array_elements(a.items) loop
      itm_id := gen_random_uuid();
      insert into public.order_items (
        id, order_id, menu_item_id, menu_item_name, quantity, unit_price, subtotal, special_requests
      ) values (
        itm_id,
        new_order_id,
        (itm->>'menu_item_id')::uuid,
        itm->>'menu_item_name',
        coalesce((itm->>'quantity')::int, 1),
        coalesce((itm->>'unit_price')::numeric, 0),
        coalesce((itm->>'subtotal')::numeric, 0),
        nullif(itm->>'special_requests','')
      );
    end loop;
  end if;

  if p_delete_audit then
    delete from public.order_deletions where id = a.id;
  end if;

  return new_order_id;
end;
$$;

grant execute on function public.restore_order_from_deletion(uuid, boolean) to authenticated, anon;
