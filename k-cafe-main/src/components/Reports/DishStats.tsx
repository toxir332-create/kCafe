import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, BarChart3 } from 'lucide-react';

interface Row { menu_item_name: string; qty: number; amount: number; }

export const DishStats: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => { load(); }, [selectedDate]);

  const load = async () => {
    setLoading(true);
    try {
      const day = selectedDate;
      // 1) Get paid orders for the selected date
      let orderIds: string[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from('orders' as any)
          .select('id, completed_at, payment_status')
          .eq('payment_status', 'paid')
          .gte('completed_at', `${day}T00:00:00`)
          .lte('completed_at', `${day}T23:59:59`);
        if (error) throw error;
        orderIds = (data || []).map((o: any) => o.id);
      } catch {
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
        const start = new Date(`${day}T00:00:00`).getTime();
        const end = new Date(`${day}T23:59:59`).getTime();
        orderIds = (localOrders || [])
          .filter(o => o.payment_status === 'paid')
          .filter(o => {
            const t = new Date(o.completed_at || o.created_at || 0).getTime();
            return t >= start && t <= end;
          })
          .map(o => o.id);
      }

      // 2) Load order_items for those orders
      let items: any[] = [];
      if (orderIds.length) {
        try {
          const { data, error } = await (supabase as any)
            .from('order_items' as any)
            .select('menu_item_name, quantity, subtotal, unit_price, order_id')
            .in('order_id', orderIds);
          if (error) throw error;
          items = (data || []) as any[];
        } catch {
          const localItems = JSON.parse(localStorage.getItem('order_items') || '[]') as any[];
          items = (localItems || []).filter(i => orderIds.includes(i.order_id));
        }
      }

      const map: Record<string, Row> = {};
      (items || []).forEach((it: any) => {
        const name = it.menu_item_name;
        if (!map[name]) map[name] = { menu_item_name: name, qty: 0, amount: 0 };
        map[name].qty += Number(it.quantity);
        const subtotal = Number(it.subtotal ?? (Number(it.unit_price) * Number(it.quantity) || 0));
        map[name].amount += subtotal;
      });
      setRows(Object.values(map).sort((a,b) => b.amount - a.amount));
    } catch (e) {
      console.error(e);
      // Local fallback from order_items in localStorage
      try {
        // fallback already covered above via orders + items filters
      } catch {}
    } finally { setLoading(false); }
  };

  const filtered = useMemo(() => rows.filter(r => r.menu_item_name.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-600">Yuklanmoqda...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center"><BarChart3 className="w-5 h-5 mr-2"/>Blyuda Statistikasi</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Qidirish..." className="pl-10 pr-3 py-2 border rounded-lg"/>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-700 border-b"><th className="py-2 text-left">Mahsulot</th><th className="text-left">Soni</th><th className="text-left">Jami</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.menu_item_name} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-900">{r.menu_item_name}</td>
                <td>{r.qty}</td>
                <td>{r.amount.toLocaleString()} so'm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
