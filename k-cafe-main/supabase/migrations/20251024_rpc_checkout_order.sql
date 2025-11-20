-- Transactional checkout RPC
create or replace function public.checkout_order(
  p_order_id uuid,
  p_payments jsonb -- [{method, amount, ext_ref}]
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_total numeric := 0;
  v_now timestamptz := now();
  v_item record;
  v_pay record;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  -- Calculate total from order_items
  for v_item in
    select subtotal from public.order_items where order_id = p_order_id
  loop
    v_total := v_total + coalesce(v_item.subtotal,0);
  end loop;

  -- Idempotent payments insert
  if p_payments is not null then
    for v_pay in
      select
        (p->>'method')::text as method,
        (p->>'amount')::numeric as amount,
        nullif(p->>'ext_ref','')::text as ext_ref
      from jsonb_array_elements(p_payments) as p
    loop
      insert into public.payments(order_id, method, amount, paid_at, ext_ref)
      values (p_order_id, v_pay.method, v_pay.amount, v_now, v_pay.ext_ref)
      on conflict (order_id, ext_ref) do nothing;
    end loop;
  end if;

  -- Close order
  update public.orders
     set total_amount = v_total,
         status = 'closed',
         completed_at = v_now
   where id = p_order_id;

  -- Audit
  insert into public.audit_logs(action, order_id, payload)
  values ('checkout', p_order_id, jsonb_build_object('total', v_total, 'payments', p_payments));

  return jsonb_build_object('status','ok','order_id',p_order_id,'total',v_total,'completed_at',v_now);
end;
$$;
