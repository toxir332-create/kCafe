// @ts-nocheck
// Supabase Edge Function: delete_order_with_audit
// Endpoint: POST /functions/v1/delete_order_with_audit
// Body: { order_id: string, deleted_by_id?: string, deleted_by_name?: string, restaurant_id?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order_id = String(body?.order_id || '').trim();
    const deleted_by_id = body?.deleted_by_id || null;
    const deleted_by_name = body?.deleted_by_name || 'Admin';
    const restaurant_id = body?.restaurant_id || null;

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Service env not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // 1) Read order and items
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const { data: items, error: itemsErr } = await sb
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);
    if (itemsErr) throw itemsErr;

    // 2) Insert audit
    const audit = {
      order_id,
      restaurant_id: restaurant_id || order.restaurant_id || null,
      deleted_by_id,
      deleted_by_name,
      total_amount: Number(order.total_amount) || 0,
      payment_method: order.payment_method || null,
      completed_at: order.completed_at || null,
      created_at: order.created_at || null,
      items: items || [],
      reason: "Admin tomonidan chek o'chirildi",
      deleted_at: new Date().toISOString(),
    } as any;
    const { error: auditErr } = await sb.from('order_deletions').insert(audit);
    if (auditErr) throw auditErr;

    // 3) Boss notification
    const note = {
      restaurant_id: audit.restaurant_id,
      type: 'order_deleted',
      title: "Chek o'chirildi",
      message: `Admin tomonidan chek o'chirildi: ${order_id}`,
      payload: { order_id, total_amount: audit.total_amount, payment_method: audit.payment_method, deleted_by: deleted_by_name },
    } as any;
    const { error: noteErr } = await sb.from('admin_notifications').insert(note);
    if (noteErr) throw noteErr;

    // 4) Delete children then order
    const { error: delItemsErr } = await sb.from('order_items').delete().eq('order_id', order_id);
    if (delItemsErr) throw delItemsErr;
    const { error: delOrderErr } = await sb.from('orders').delete().eq('id', order_id);
    if (delOrderErr) throw delOrderErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
