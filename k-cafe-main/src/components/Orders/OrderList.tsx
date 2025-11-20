import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, DollarSign, MapPin, Receipt, Calendar, Printer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ReceiptPrint } from '../Tables/ReceiptPrint';

type ServedOrder = {
  id: string;
  table_id: string | null;
  total_amount: number;
  payment_method: string | null;
  completed_at: string | null;
};

type OrderItem = {
  id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_requests?: string;
  order_id?: string;
};

export const OrderList: React.FC = () => {
  const { profile } = useAuth();
  const [servedOrders, setServedOrders] = useState<ServedOrder[]>([]);
  const [tableNumbers, setTableNumbers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // default to today
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServedOrder | null>(null);
  const [receiptItems, setReceiptItems] = useState<OrderItem[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ card?: string; qr?: string; name?: string }>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Build a date-bounded query for the selected day
        let query = supabase
          .from('orders')
          .select('id, table_id, total_amount, payment_method, completed_at')
          .eq('status', 'closed');

        if (selectedDate) {
          const start = new Date(selectedDate + 'T00:00:00.000Z');
          const end = new Date(selectedDate + 'T23:59:59.999Z');
          query = query.gte('completed_at', start.toISOString()).lte('completed_at', end.toISOString());
        }

        const { data, error } = await query.order('completed_at', { ascending: false });
        if (error) throw error;
        const served = (data || []) as ServedOrder[];
        setServedOrders(served);
        // fetch table numbers
        const ids = Array.from(new Set(served.map(o => o.table_id).filter(Boolean))) as string[];
        if (ids.length) {
          const { data: tables } = await supabase
            .from('tables')
            .select('id, number')
            .in('id', ids);
          type TableRow = { id: string; number: number };
          const trows = (tables || []) as TableRow[];
          const map: Record<string, number> = {};
          trows.forEach((t) => { map[t.id] = t.number; });
          setTableNumbers(map);
        }
      } catch {
        // local fallback
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
        let closed = localOrders.filter(o => o.status === 'closed');
        if (selectedDate) {
          const dStart = new Date(selectedDate + 'T00:00:00');
          const dEnd = new Date(selectedDate + 'T23:59:59.999');
          closed = closed.filter(o => {
            if (!o.completed_at) return false;
            const dt = new Date(o.completed_at);
            return dt >= dStart && dt <= dEnd;
          });
          closed.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        } else {
          closed.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        }
        setServedOrders(closed);
        const localTables = JSON.parse(localStorage.getItem('tables') || '[]') as any[];
        const map: Record<string, number> = {};
        localTables.forEach((t: any) => { map[t.id] = t.number; });
        setTableNumbers(map);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDate]);

  useEffect(() => {
    (async () => {
      try {
        // apply cached immediately
        try {
          const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
          if (cached) setOwnerInfo({ card: cached.owner_card_number || '', qr: cached.owner_qr_url || '', name: cached.restaurant_name || '' });
        } catch {}

        const remoteAllowed = localStorage.getItem('restaurant_settings_remote_allowed');
        if (remoteAllowed === 'false') return;

        const rawId: any = (profile as any)?.restaurant_id || (profile as any)?.id || null;
        const isUuid = !!(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId));
        let q: any = (supabase as any).from('restaurant_settings' as any).select('owner_card_number, owner_qr_url, restaurant_name' as any).limit(1);
        if (isUuid) q = q.eq('restaurant_id', rawId);
        const { data, error }: any = await q.maybeSingle();
        if (error?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
          return;
        }
        if (data) {
          setOwnerInfo({ card: data.owner_card_number || '', qr: data.owner_qr_url || '', name: data.restaurant_name || '' });
          try { localStorage.setItem('restaurant_settings_cache', JSON.stringify({ ...(JSON.parse(localStorage.getItem('restaurant_settings_cache')||'{}')), ...data })); } catch {}
        }
      } catch {}
    })();
  }, []);

  const openReceipt = async (order: ServedOrder) => {
    try {
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      if (error) throw error;
      setReceiptItems((items || []) as OrderItem[]);
    } catch {
      const localItems = JSON.parse(localStorage.getItem('order_items') || '[]') as any[];
      setReceiptItems(localItems.filter(i => i.order_id === order.id) as OrderItem[]);
    } finally {
      setSelectedOrder(order);
      setShowReceipt(true);
    }
  };

  const deleteOrderWithAudit = async (order: ServedOrder) => {
    if (!order?.id) return;
    const sure = confirm("Ushbu chekni o'chirishni tasdiqlaysizmi? (Admin)");
    if (!sure) return;
    setDeletingId(order.id);
    try {
      // Use ONLY the DB RPC that performs audit + notification + safe delete in one transaction
      const { error: rpcErr } = await (supabase as any).rpc('delete_order_with_audit', {
        p_id: order.id,
        p_deleted_by_id: (profile as any)?.id || null,
        p_deleted_by_name: (profile as any)?.name || 'Admin',
        p_restaurant_id: (profile as any)?.restaurant_id || (profile as any)?.id || null,
      });
      if (rpcErr) throw rpcErr;

      // Update UI only on success
      setServedOrders(prev => prev.filter(o => o.id !== order.id));
      alert("Chek o'chirildi (RPC)");
    } catch (e: any) {
      console.error('Delete order failed:', e);
      alert("Chekni o'chirishda xatolik yuz berdi: " + (e?.message || 'noma\'lum xato'));
    } finally {
      setDeletingId(null);
    }
  };

  const dayTotal = servedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Yopilgan Stollar</h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            title="Bugun"
          >
            Bugun
          </button>
          <button
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            title="Kechagi"
          >
            Kecha
          </button>
          <button
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={() => setSelectedDate('')}
            title="Barchasi"
          >
            Barchasi
          </button>
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-gray-200 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">Tanlangan kunda yopilgan cheklar jami:</span>
        <span className="text-2xl font-bold text-blue-600">{dayTotal.toLocaleString()} so'm</span>
      </div>

      {servedOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">Hozircha yopilgan stol yo'q</p>
          <p className="text-gray-400 text-sm mt-2">Buyurtmalarni yakunlang va bu yerda ko'rishingiz mumkin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servedOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span><strong>Stol:</strong> {o.table_id ? (tableNumbers[o.table_id] || 'Noma’lum') : '—'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="font-semibold">{Number(o.total_amount || 0).toLocaleString()} so'm</span>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600 justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {o.completed_at ? new Date(o.completed_at).toLocaleString('uz-UZ') : '—'}
                </div>
                <div>
                  To'lov: {o.payment_method || '—'}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => openReceipt(o)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Printer className="w-4 h-4 mr-2" /> Chekni Ko'rish
                </button>
                <button
                  onClick={() => deleteOrderWithAudit(o)}
                  disabled={deletingId === o.id}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  title="Chekni o'chirish (Admin)"
                >
                  {deletingId === o.id ? 'O\'chirilmoqda...' : 'Chekni O\'chirish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showReceipt && selectedOrder && (
        <ReceiptPrint
          order={{
            ...(selectedOrder as any),
            table_id: selectedOrder.table_id || '',
            status: 'served',
            payment_status: 'paid',
            created_at: selectedOrder.completed_at || new Date().toISOString()
          } as any}
          orderItems={receiptItems}
          tableNumber={selectedOrder.table_id ? (tableNumbers[selectedOrder.table_id] || 0) : 0}
          restaurantName={ownerInfo.name || 'Mening Restoranim'}
          waiterName={profile?.name}
          ownerCard={ownerInfo.card}
          ownerQrUrl={ownerInfo.qr}
          onClose={() => {
            setShowReceipt(false);
            setSelectedOrder(null);
            setReceiptItems([]);
          }}
        />
      )}
    </div>
  );
};