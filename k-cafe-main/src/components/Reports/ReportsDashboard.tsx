import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const ReportsDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    cashPayments: 0,
    cardPayments: 0,
    qrPayments: 0
  });
  // Removed weekly aggregation state; we only show selected day now
  const [netProfit, setNetProfit] = useState(0);
  const [waiterTop, setWaiterTop] = useState<{ name: string; total: number }[]>([]);
  const [dishStats, setDishStats] = useState<{ name: string; qty: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed period toggles; only calendar date is used
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReports();
  }, [selectedDate, profile?.id]);

  // Auto-refresh when viewing today to keep dashboard live
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) return;
    const id = setInterval(() => {
      loadReports();
    }, 10000);
    return () => clearInterval(id);
  }, [selectedDate, profile?.id]);

  const loadReports = async () => {
    setLoading(true);
    // reset dish stats to avoid showing stale aggregated data from other periods
    setDishStats([]);
    try {
      const day = selectedDate || new Date().toISOString().split('T')[0];
      const startLocal = `${day}T00:00:00`;
      const endLocal = `${day}T23:59:59`;
      const startUTC = `${day}T00:00:00.000Z`;
      const endUTC = `${day}T23:59:59.999Z`;

      // Determine restaurant scope (fallback to profile.id if restaurant_id missing)
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || '';

      // Load selected day's paid orders with fallback (completed_at or created_at if completed_at is null)
      let todayOrders: any[] = [];
      try {
        const base = supabase as any;
        let q1 = base
          .from('orders' as any)
          .select('*')
          .or('payment_status.eq.paid,status.eq.served')
          .gte('completed_at', startLocal)
          .lte('completed_at', endLocal);
        let q1utc = base
          .from('orders' as any)
          .select('*')
          .or('payment_status.eq.paid,status.eq.served')
          .gte('completed_at', startUTC)
          .lte('completed_at', endUTC);
        let q2 = base
          .from('orders' as any)
          .select('*')
          .or('payment_status.eq.paid,status.eq.served')
          .gte('created_at', startLocal)
          .lte('created_at', endLocal);
        let q2utc = base
          .from('orders' as any)
          .select('*')
          .or('payment_status.eq.paid,status.eq.served')
          .gte('created_at', startUTC)
          .lte('created_at', endUTC);
        if (restaurantId) {
          q1 = q1.eq('restaurant_id', restaurantId);
          q1utc = q1utc.eq('restaurant_id', restaurantId);
          q2 = q2.eq('restaurant_id', restaurantId);
          q2utc = q2utc.eq('restaurant_id', restaurantId);
        }
        const [{ data: d1 }, { data: d1u }, { data: d2 }, { data: d2u }] = await Promise.all([q1, q1utc, q2, q2utc]);
        let merged = [...(d1 || []), ...(d1u || []), ...(d2 || []), ...(d2u || [])];
        // dedupe by id
        const seen: Record<string, boolean> = {};
        todayOrders = merged.filter((o: any) => (seen[o.id] ? false : (seen[o.id] = true)));
        // Broaden if nothing found: try any status within created_at local window (same restaurant)
        if (!todayOrders || todayOrders.length === 0) {
          let qBroad = base
            .from('orders' as any)
            .select('*')
            .gte('created_at', startLocal)
            .lte('created_at', endLocal)
            .order('created_at', { ascending: false });
          if (restaurantId) qBroad = qBroad.eq('restaurant_id', restaurantId);
          const { data: b1 } = await qBroad;
          todayOrders = (b1 || []) as any[];
        }
        // If still empty, drop restaurant filter entirely
        if (!todayOrders || todayOrders.length === 0) {
          const { data: b2 } = await base
            .from('orders' as any)
            .select('*')
            .gte('created_at', startLocal)
            .lte('created_at', endLocal)
            .order('created_at', { ascending: false });
          todayOrders = (b2 || []) as any[];
        }
      } catch {
        const local = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
        todayOrders = (local || [])
          .filter(o => (o.payment_status === 'paid') || (o.status === 'served'))
          .filter(o => !restaurantId || o.restaurant_id === restaurantId)
          .filter(o => {
            const t = new Date(o.completed_at || o.created_at || 0);
            // accept both local and UTC comparisons
            const startA = new Date(startUTC);
            const endA = new Date(endUTC);
            const startB = new Date(startLocal);
            const endB = new Date(endLocal);
            const inUTC = t >= startA && t <= endA;
            const inLocal = t >= startB && t <= endB;
            return inUTC || inLocal;
          });
        if (!todayOrders || todayOrders.length === 0) {
          // very broad local fallback: any status in local window
          todayOrders = (local || [])
            .filter(o => !restaurantId || o.restaurant_id === restaurantId)
            .filter(o => {
              const t = new Date(o.completed_at || o.created_at || 0);
              const inUTC = t >= new Date(startUTC) && t <= new Date(endUTC);
              const inLocal = t >= new Date(startLocal) && t <= new Date(endLocal);
              return inUTC || inLocal;
            });
        }
      }

      if (todayOrders && todayOrders.length >= 0) {
        // First pass using stored totals
        let stats = {
          totalSales: todayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          totalOrders: todayOrders.length,
          totalCustomers: todayOrders.length,
          cashPayments: todayOrders
            .filter(o => o.payment_method === 'cash')
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          cardPayments: todayOrders
            .filter(o => o.payment_method === 'card')
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          qrPayments: todayOrders
            .filter(o => o.payment_method === 'qr_code')
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
        };
        setTodayStats(stats);

        // Net profit = sales - todays wages - expenses
        const todayStr = day;
        let wages: any[] = [];
        try {
          const { data } = await supabase
            .from('wage_payments' as any)
            .select('amount, paid_date')
            .eq('restaurant_id', restaurantId || '')
            .eq('paid_date', todayStr);
          wages = (data || []) as any[];
        } catch {
          const local = JSON.parse(localStorage.getItem('wage_payments') || '[]') as any[];
          wages = (local || [])
            .filter(w => !profile?.id || w.restaurant_id === profile?.id)
            .filter(w => (w.paid_date || '').split('T')[0] === todayStr);
        }
        let expenses: any[] = [];
        try {
          const { data } = await supabase
            .from('expenses' as any)
            .select('amount, expense_date')
            .eq('restaurant_id', restaurantId || '')
            .eq('expense_date', todayStr);
          expenses = (data || []) as any[];
        } catch {
          const local = JSON.parse(localStorage.getItem('expenses') || '[]') as any[];
          expenses = (local || [])
            .filter(e => !profile?.id || e.restaurant_id === profile?.id)
            .filter(e => (e.expense_date || '').split('T')[0] === todayStr);
        }
        const wagesSum = (wages || []).reduce((s, r) => s + Number(r.amount), 0);
        const expensesSum = (expenses || []).reduce((s, r) => s + Number(r.amount), 0);
        setNetProfit(stats.totalSales - wagesSum - expensesSum);

        // Top waiters by sales today
        const waiterTotals: Record<string, number> = {};
        todayOrders.forEach(o => {
          if (o.waiter_id) {
            waiterTotals[o.waiter_id] = (waiterTotals[o.waiter_id] || 0) + Number(o.total_amount);
          }
        });
        const ids = Object.keys(waiterTotals);
        if (ids.length) {
          let staff: any[] = [];
          try {
            const { data } = await supabase
              .from('staff' as any)
              .select('id, name')
              .eq('restaurant_id', restaurantId || '')
              .in('id', ids);
            staff = (data || []) as any[];
          } catch {
            staff = (JSON.parse(localStorage.getItem('staff') || '[]') as any[])
              .filter(s => !profile?.id || s.restaurant_id === profile?.id);
          }
          const mapped = ids.map(id => ({
            name: staff?.find(s => s.id === id)?.name || 'Ofitsiant',
            total: waiterTotals[id]
          })).sort((a,b) => b.total - a.total).slice(0, 5);
          setWaiterTop(mapped);
        } else {
          setWaiterTop([]);
        }

        // Dish stats for selected date
        try {
          const orderIds = todayOrders.map(o => o.id);
          let items: any[] = [];
          if (orderIds.length) {
            try {
              const { data: itemsData } = await supabase
                .from('order_items' as any)
                .select('menu_item_name, quantity, unit_price, subtotal, order_id')
                .in('order_id', orderIds);
              items = (itemsData || []) as any[];
            } catch {
              const localItems = JSON.parse(localStorage.getItem('order_items') || '[]') as any[];
              items = (localItems || []).filter(i => orderIds.includes(i.order_id));
            }
          }
          // Recompute totals from items if some orders lack total_amount
          const byOrderTotal: Record<string, number> = {};
          items.forEach(it => {
            const add = Number(it.subtotal ?? (Number(it.unit_price) * Number(it.quantity) || 0)) || 0;
            byOrderTotal[it.order_id] = (byOrderTotal[it.order_id] || 0) + add;
          });
          const recomputedTotal = todayOrders.reduce((sum, o) => sum + (byOrderTotal[o.id] ?? Number(o.total_amount || 0)), 0);
          const recomputedCash = todayOrders
            .filter(o => o.payment_method === 'cash')
            .reduce((s, o) => s + (byOrderTotal[o.id] ?? Number(o.total_amount || 0)), 0);
          const recomputedCard = todayOrders
            .filter(o => o.payment_method === 'card')
            .reduce((s, o) => s + (byOrderTotal[o.id] ?? Number(o.total_amount || 0)), 0);
          const recomputedQr = todayOrders
            .filter(o => o.payment_method === 'qr_code')
            .reduce((s, o) => s + (byOrderTotal[o.id] ?? Number(o.total_amount || 0)), 0);
          stats = {
            ...stats,
            totalSales: recomputedTotal,
            cashPayments: recomputedCash,
            cardPayments: recomputedCard,
            qrPayments: recomputedQr,
          };
          setTodayStats(stats);
          const agg: Record<string, { qty: number; total: number }> = {};
          items.forEach(it => {
            const key = it.menu_item_name || 'Noma’lum';
            if (!agg[key]) agg[key] = { qty: 0, total: 0 };
            agg[key].qty += Number(it.quantity) || 0;
            agg[key].total += Number(it.subtotal ?? (Number(it.unit_price) * Number(it.quantity) || 0)) || 0;
          });
          const list = Object.entries(agg)
            .map(([name, v]) => ({ name, qty: v.qty, total: v.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 20);
          setDishStats(list);
        } catch {
          setDishStats([]);
        }
      }

      // Weekly/monthly analysis removed per request
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // weekly/month helpers removed (no longer used)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Hisobotlar</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-900">Jami Sotuv</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {todayStats.totalSales.toLocaleString()}
          </p>
          <p className="text-sm text-green-700 mt-1">so'm</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-900">Buyurtmalar</p>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{todayStats.totalOrders}</p>
          <p className="text-sm text-blue-700 mt-1">ta buyurtma</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-900">Mijozlar</p>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{todayStats.totalCustomers}</p>
          <p className="text-sm text-purple-700 mt-1">ta mijoz</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-900">O'rtacha Chek</p>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {todayStats.totalOrders > 0
              ? Math.round(todayStats.totalSales / todayStats.totalOrders).toLocaleString()
              : 0}
          </p>
          <p className="text-sm text-orange-700 mt-1">so'm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">To'lov Usullari</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Naqd Pul</span>
              <span className="text-sm font-bold text-green-600">
                {todayStats.cashPayments.toLocaleString()} so'm
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Karta</span>
              <span className="text-sm font-bold text-blue-600">
                {todayStats.cardPayments.toLocaleString()} so'm
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">QR Kod</span>
              <span className="text-sm font-bold text-purple-600">
                {todayStats.qrPayments.toLocaleString()} so'm
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tanlangan Kun Tahlili</h3>
          <div className="text-sm text-gray-600">
            Tanlangan sana: <span className="font-semibold">{new Date(selectedDate).toLocaleDateString('uz-UZ')}</span>.
            Yuqoridagi kartalarda kunlik jami ko‘rsatkichlar, pastda blyuda statistikasi va ofitsiantlar ro‘yxati ko‘rsatilgan.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Bugungi Sof Foyda</h3>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {Math.round(netProfit).toLocaleString()} so'm
          </p>
          <p className="text-xs text-gray-500 mt-1">Sotuv − maoshlar − harajatlar</p>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Ofitsiantlar (tanlangan kun)</h3>
          {waiterTop.length === 0 ? (
            <div className="text-gray-500">Ma'lumot yo'q</div>
          ) : (
            <div className="space-y-2">
              {waiterTop.map(w => (
                <div key={w.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{w.name}</span>
                  <span className="font-semibold text-gray-900">{w.total.toLocaleString()} so'm</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Dish statistics for selected day */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Blyuda Statistikasi ({new Date(selectedDate).toLocaleDateString('uz-UZ')})</h3>
        {dishStats.length === 0 ? (
          <div className="text-gray-500">Ma'lumot yo'q</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dishStats.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{d.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{d.qty} dona</span>
                  <span className="font-semibold text-gray-900">{d.total.toLocaleString()} so'm</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
