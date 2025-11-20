-- RPC to hard delete an order and its items atomically
create or replace function public.hard_delete_order(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- delete children first to satisfy FK
  delete from public.order_items where order_id = p_id;
  delete from public.orders where id = p_id;
end;
$$;

grant execute on function public.hard_delete_order(uuid) to authenticated;
