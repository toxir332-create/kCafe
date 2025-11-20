import React from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp
} from 'lucide-react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        <p className={`text-sm mt-2 ${color}`}>{change}</p>
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

export const DashboardStats: React.FC = () => {
  const { tables } = useRestaurant();
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [todayOrderCount, setTodayOrderCount] = useState<number>(0);
  // Removed detailed kitchen status cards per request
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [netProfit, setNetProfit] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const day = dateStr;
      try {
        // Read closed orders by completed_at for selected day
        const { data, error } = await supabase
          .from('orders')
          .select('id, total_amount, status, completed_at')
          .eq('status', 'closed')
          .gte('completed_at', `${day}T00:00:00.000Z`)
          .lte('completed_at', `${day}T23:59:59.999Z`);
        if (error) throw error;
        const closed = (data as any[] | null) || [];
        const total = closed.reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
        setTodayRevenue(total);
        setTodayOrderCount(closed.length);

        // wages and expenses for the day
        let wages: any[] = [];
        try {
          const { data: wagesData } = await supabase
            .from('wage_payments' as any)
            .select('amount, paid_date')
            .eq('paid_date', day);
          wages = (wagesData || []) as any[];
        } catch {
          const local = JSON.parse(localStorage.getItem('wage_payments') || '[]') as any[];
          wages = (local || []).filter(w => (w.paid_date || '').split('T')[0] === day);
        }
        let expenses: any[] = [];
        try {
          const { data: expData } = await supabase
            .from('expenses' as any)
            .select('amount, expense_date')
            .eq('expense_date', day);
          expenses = (expData || []) as any[];
        } catch {
          const local = JSON.parse(localStorage.getItem('expenses') || '[]') as any[];
          expenses = (local || []).filter(e => (e.expense_date || '').split('T')[0] === day);
        }
        const wagesSum = (wages || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const expensesSum = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        setNetProfit(total - wagesSum - expensesSum);
      } catch {
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const start = new Date(`${day}T00:00:00.000Z`).getTime();
        const end = new Date(`${day}T23:59:59.999Z`).getTime();
        const today = localOrders.filter((o: any) => {
          const t = new Date(o.completed_at || o.created_at).getTime();
          return t >= start && t <= end;
        });
        const closed = today.filter((o: any) => o.status === 'closed');
        const total = closed.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
        setTodayRevenue(total);
        setTodayOrderCount(closed.length);

        const wages = (JSON.parse(localStorage.getItem('wage_payments') || '[]') as any[])
          .filter(w => (w.paid_date || '').split('T')[0] === day);
        const expenses = (JSON.parse(localStorage.getItem('expenses') || '[]') as any[])
          .filter(e => (e.expense_date || '').split('T')[0] === day);
        const wagesSum = (wages || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const expensesSum = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        setNetProfit(total - wagesSum - expensesSum);
      }
    };
    load();
  }, [dateStr]);

  const activeTables = tables.filter(table => table.status === 'occupied').length;
  const totalTables = tables.length;

  const avgOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <h2 className="text-2xl font-bold text-gray-900">Boshqaruv Paneli</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
          />
          <button
            onClick={() => setDateStr(new Date().toISOString().slice(0,10))}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Bugun
          </button>
        </div>
      </div>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Bugungi Daromad"
          value={`${todayRevenue.toLocaleString()} so'm`}
          change="+12.3% kechagidan"
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          color="text-green-600"
        />
        <StatCard
          title="Bugungi Buyurtmalar"
          value={todayOrderCount}
          change="+8.7% kechagidan"
          icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
          color="text-blue-600"
        />
        <StatCard
          title="Faol Stollar"
          value={`${activeTables}/${totalTables}`}
          change={`${totalTables - activeTables} ta bo'sh`}
          icon={<Users className="w-6 h-6 text-purple-600" />}
          color="text-purple-600"
        />
        <StatCard
          title="O'rtacha Buyurtma"
          value={`${avgOrderValue.toLocaleString()} so'm`}
          change="+5.2% kechagidan"
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          color="text-orange-600"
        />
      </div>

      {/* Net Profit Card (per selected date) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Bir Kunlik Sof Foyda</h3>
            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}></div>
          </div>
          <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} mb-1`}>
            {Math.round(netProfit).toLocaleString()} so'm
          </div>
          <p className="text-sm text-gray-600">Sotuv − maoshlar − harajatlar</p>
        </div>
      </div>
    </div>
  );
};