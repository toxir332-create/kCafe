import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Receipt, Search, CreditCard, Banknote, QrCode, Trash2, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Order {
  id: string;
  table_id: string;
  status: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  completed_at: string;
  created_at: string;
}

interface OrderWithTable extends Order {
  table_number?: number;
  items_count?: number;
}

export const PaymentsHistory: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('today');
  const [netProfit, setNetProfit] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filterDate, profile?.id]);

  // Auto-refresh when viewing today
  useEffect(() => {
    if (filterDate !== 'today') return;
    const id = setInterval(() => loadPayments(), 10000);
    return () => clearInterval(id);
  }, [filterDate, profile?.id]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      // Build date window
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      if (filterDate === 'today') {
        startDate = new Date(`${todayStr}T00:00:00`);
        endDate = new Date(`${todayStr}T23:59:59`);
      } else if (filterDate === 'week') {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
      } else if (filterDate === 'month') {
        endDate = new Date();
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        // all time
        startDate = new Date('1970-01-01T00:00:00');
        endDate = now;
      }
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const startLocal = `${fmt(startDate)}T00:00:00`;
      const endLocal = `${fmt(endDate)}T23:59:59`;
      const startUTC = `${fmt(startDate)}T00:00:00.000Z`;
      const endUTC = `${fmt(endDate)}T23:59:59.999Z`;

      // Fetch orders (paid or served) within window using both completed_at and created_at
      const sb: any = supabase;
      let qA = sb.from('orders').select('*').or('payment_status.eq.paid,status.eq.served')
        .gte('completed_at', startLocal).lte('completed_at', endLocal);
      let qAu = sb.from('orders').select('*').or('payment_status.eq.paid,status.eq.served')
        .gte('completed_at', startUTC).lte('completed_at', endUTC);
      let qB = sb.from('orders').select('*').or('payment_status.eq.paid,status.eq.served')
        .gte('created_at', startLocal).lte('created_at', endLocal);
      let qBu = sb.from('orders').select('*').or('payment_status.eq.paid,status.eq.served')
        .gte('created_at', startUTC).lte('created_at', endUTC);
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id;
      if (restaurantId) {
        qA = qA.eq('restaurant_id', restaurantId);
        qAu = qAu.eq('restaurant_id', restaurantId);
        qB = qB.eq('restaurant_id', restaurantId);
        qBu = qBu.eq('restaurant_id', restaurantId);
      }
      const [{ data: a }, { data: au }, { data: b }, { data: bu }] = await Promise.all([qA, qAu, qB, qBu]);
      let ordersData: Order[] = ([...(a || []), ...(au || []), ...(b || []), ...(bu || [])] as any[])
        .filter((o, idx, arr) => arr.findIndex(x => x.id === o.id) === idx);

      // Fallback to localStorage if API failed entirely
      if (!ordersData || ordersData.length === 0) {
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
        ordersData = (localOrders || [])
          .filter(o => (o.payment_status === 'paid') || (o.status === 'served'))
          .filter(o => !restaurantId || o.restaurant_id === restaurantId)
          .filter(o => {
            const t = new Date(o.completed_at || o.created_at || 0);
            const inUTC = t >= new Date(startUTC) && t <= new Date(endUTC);
            const inLocal = t >= new Date(startLocal) && t <= new Date(endLocal);
            return inUTC || inLocal;
          }) as any;
      }

      const ordersWithDetails = await Promise.all(
        (ordersData as Order[]).map(async (order: Order) => {
          const { data: table } = await (supabase as any)
            .from('tables')
            .select('number')
            .eq('id', order.table_id)
            .maybeSingle();

          const { count } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);

          return {
            ...order,
            table_number: (table as any)?.number,
            items_count: count || 0
          };
        })
      );

      setOrders(ordersWithDetails);

      // compute net profit for the selected window (sum of days)
      // wages/expenses are stored per-day; sum across range
      let wagesSum = 0;
      let expensesSum = 0;
      try {
        let wq = sb.from('wage_payments').select('amount, paid_date');
        let eq = sb.from('expenses').select('amount, expense_date');
        if (restaurantId) {
          wq = wq.eq('restaurant_id', restaurantId);
          eq = eq.eq('restaurant_id', restaurantId);
        }
        const [{ data: ww }, { data: ee }] = await Promise.all([
          wq.gte('paid_date', fmt(startDate)).lte('paid_date', fmt(endDate)),
          eq.gte('expense_date', fmt(startDate)).lte('expense_date', fmt(endDate))
        ]);
        wagesSum = (ww || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        expensesSum = (ee || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      } catch {
        const ww = (JSON.parse(localStorage.getItem('wage_payments') || '[]') as any[])
          .filter(r => !restaurantId || r.restaurant_id === restaurantId)
          .filter(r => (r.paid_date || '').split('T')[0] >= fmt(startDate) && (r.paid_date || '').split('T')[0] <= fmt(endDate));
        const ee = (JSON.parse(localStorage.getItem('expenses') || '[]') as any[])
          .filter(r => !restaurantId || r.restaurant_id === restaurantId)
          .filter(r => (r.expense_date || '').split('T')[0] >= fmt(startDate) && (r.expense_date || '').split('T')[0] <= fmt(endDate));
        wagesSum = (ww || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        expensesSum = (ee || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      }
      const salesSum = (ordersWithDetails || []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);
      setNetProfit(salesSum - wagesSum - expensesSum);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!orderId) return;
    if (!confirm("Yopilgan chekni o'chirishni tasdiqlaysizmi?")) return;
    setDeletingId(orderId);
    try {
      const supa: any = supabase as any;
      const { error } = await supa.rpc('delete_order_with_audit', {
        p_id: orderId,
        p_deleted_by_id: null,
        p_deleted_by_name: 'Admin',
        p_restaurant_id: null
      });
      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== orderId));
      alert("Chek o'chirildi (RPC)");
    } catch (err) {
      console.error('Error deleting order:', err);
      alert("Chekni o'chirishda xatolik yuz berdi: " + (err as any)?.message || '');
    } finally {
      setDeletingId(null);
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (filterMethod !== 'all') {
      filtered = filtered.filter(order => order.payment_method === filterMethod);
    }

    if (filterDate === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(order =>
        new Date(order.completed_at).toDateString() === today
      );
    } else if (filterDate === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(order =>
        new Date(order.completed_at) >= weekAgo
      );
    } else if (filterDate === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(order =>
        new Date(order.completed_at) >= monthAgo
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.table_number?.toString().includes(searchTerm)
      );
    }

    return filtered;
  };

  const getTotalStats = () => {
    const filtered = getFilteredOrders();
    const total = filtered.reduce((sum, order) => sum + order.total_amount, 0);
    const cash = filtered.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_amount, 0);
    const card = filtered.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + o.total_amount, 0);
    const qr = filtered.filter(o => o.payment_method === 'qr_code').reduce((sum, o) => sum + o.total_amount, 0);

    return { total, cash, card, qr, count: filtered.length };
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'qr_code':
        return <QrCode className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Naqd';
      case 'card':
        return 'Karta';
      case 'qr_code':
        return 'QR Kod';
      default:
        return 'Noma\'lum';
    }
  };

  const stats = getTotalStats();
  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">To'lovlar Tarixi</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-900">Jami To'lovlar</p>
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.count} ta</p>
          <p className="text-sm text-blue-700 mt-1">{stats.total.toLocaleString()} so'm</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-900">Naqd Pul</p>
            <Banknote className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.cash.toLocaleString()}</p>
          <p className="text-sm text-green-700 mt-1">so'm</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-900">Karta</p>
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.card.toLocaleString()}</p>
          <p className="text-sm text-purple-700 mt-1">so'm</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-900">QR Kod</p>
            <QrCode className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">{stats.qr.toLocaleString()}</p>
          <p className="text-sm text-orange-700 mt-1">so'm</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-emerald-900">Sof Foyda (Bugun)</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className={`text-2xl font-bold ${netProfit>=0?'text-emerald-900':'text-red-700'}`}>{Math.round(netProfit).toLocaleString()} so'm</p>
          <p className="text-sm text-emerald-700 mt-1">sotuv − maosh − harajat</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Qidiruv (Buyurtma ID, Stol raqami)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Barcha Vaqt</option>
              <option value="today">Bugun</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Oy</option>
            </select>

            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Barcha To'lovlar</option>
              <option value="cash">Naqd</option>
              <option value="card">Karta</option>
              <option value="qr_code">QR Kod</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900">Buyurtma ID</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900 hidden sm:table-cell">Stol</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">Mahsulotlar</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900">Summa</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">To'lov Usuli</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900">Sana</th>
                <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold text-gray-900">Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    To'lovlar topilmadi
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-xs sm:text-sm font-mono text-gray-900">
                        {order.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {order.table_number ? `${order.table_number}-stol` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {order.items_count} ta
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm sm:text-base font-semibold text-gray-900">
                        {order.total_amount.toLocaleString()} so'm
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(order.payment_method)}
                        <span className="text-sm text-gray-700">
                          {getPaymentMethodLabel(order.payment_method)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs sm:text-sm text-gray-600">
                        {new Date(order.completed_at).toLocaleString('uz-UZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteOrder(order.id)}
                        disabled={deletingId === order.id}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        title="Chekni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">O'chirish</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
