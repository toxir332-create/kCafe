-- RPC: delete_order_with_audit
-- Performs: items snapshot -> order_deletions insert -> admin_notifications insert -> hard delete
-- Runs as SECURITY DEFINER to bypass RLS for delete while still relying on RLS for inserts where allowed.

create or replace function public.delete_order_with_audit(
  p_id uuid,
  p_deleted_by_id uuid default null,
  p_deleted_by_name text default 'Admin',
  p_restaurant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_items jsonb := '[]'::jsonb;
  v_restaurant uuid;
begin
  -- 0) Read order
  select * into v_order from public.orders where id = p_id;
  if not found then
    raise exception 'Order % not found', p_id using errcode = 'P0002';
  end if;

  -- 1) Items snapshot
  select coalesce(jsonb_agg(to_jsonb(oi) - 'id'), '[]'::jsonb)
    into v_items
  from public.order_items oi
  where oi.order_id = p_id;

  -- 2) Resolve restaurant id
  v_restaurant := coalesce(p_restaurant_id, v_order.restaurant_id);

  -- 3) Audit row
  insert into public.order_deletions (
    order_id, restaurant_id, deleted_by_id, deleted_by_name,
    total_amount, payment_method, completed_at, created_at,
    items, reason, deleted_at
  ) values (
    p_id, v_restaurant, p_deleted_by_id, p_deleted_by_name,
    coalesce(v_order.total_amount, 0), v_order.payment_method, v_order.completed_at, v_order.created_at,
    v_items, 'Admin tomonidan chek o''chirildi', now()
  );

  -- 4) Boss notification
  insert into public.admin_notifications (
    restaurant_id, type, title, message, payload
  ) values (
    v_restaurant,
    'order_deleted',
    'Chek o''chirildi',
    format('Admin tomonidan chek o''chirildi: %s', p_id),
    jsonb_build_object(
      'order_id', p_id,
      'total_amount', coalesce(v_order.total_amount, 0),
      'payment_method', v_order.payment_method,
      'deleted_by', coalesce(p_deleted_by_name, 'Admin')
    )
  );

  -- 5) Hard delete (children first)
  delete from public.order_items where order_id = p_id;
  delete from public.orders where id = p_id;
end;
$$;

grant execute on function public.delete_order_with_audit(uuid, uuid, text, uuid) to authenticated, anon;
