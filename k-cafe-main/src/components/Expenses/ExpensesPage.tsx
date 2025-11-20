import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Search, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ExpenseRow { id: string; name: string; amount: number; expense_date: string; created_by?: string | null; }

export const ExpensesPage: React.FC = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today'|'week'|'month'|'all'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [form, setForm] = useState<{ name: string; amount: string; date: string }>({ name: '', amount: '', date: new Date().toISOString().slice(0,10) });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.error(e);
      // Local fallback
      try {
        const local = JSON.parse(localStorage.getItem('expenses') || '[]') as ExpenseRow[];
        local.sort((a,b)=> new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
        setList(local);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let f = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    const now = new Date();
    if (selectedDate) {
      const sel = new Date(selectedDate).toDateString();
      f = f.filter(e => new Date(e.expense_date).toDateString() === sel);
      return f;
    }
    if (dateFilter === 'today') {
      const t = now.toDateString();
      f = f.filter(e => new Date(e.expense_date).toDateString() === t);
    } else if (dateFilter === 'week') {
      const w = new Date(); w.setDate(w.getDate()-7);
      f = f.filter(e => new Date(e.expense_date) >= w);
    } else if (dateFilter === 'month') {
      const m = new Date(); m.setMonth(m.getMonth()-1);
      f = f.filter(e => new Date(e.expense_date) >= m);
    }
    return f;
  }, [list, search, dateFilter, selectedDate]);

  const totals = useMemo(() => filtered.reduce((sum, e) => sum + Number(e.amount), 0), [filtered]);

  const save = async () => {
    if (!form.name || !form.amount) return;
    const amountNum = parseFloat(form.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) return;
    try {
      const sb: any = supabase;
      const payload: any = { name: form.name, amount: amountNum, expense_date: form.date, created_by: profile?.name || 'admin' };
      const { error } = await sb
        .from('expenses' as any)
        .insert([payload] as any);
      if (error) throw error;
      setShowForm(false);
      setForm({ name: '', amount: '', date: new Date().toISOString().slice(0,10) });
      await load();
    } catch (e) {
      // Local fallback insert
      const id = (globalThis as any)?.crypto?.randomUUID?.() || `exp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const row: ExpenseRow = { id, name: form.name, amount: amountNum, expense_date: form.date, created_by: profile?.name || 'admin' } as any;
      try {
        const local = JSON.parse(localStorage.getItem('expenses') || '[]') as ExpenseRow[];
        local.unshift(row);
        localStorage.setItem('expenses', JSON.stringify(local));
        setShowForm(false);
        setForm({ name: '', amount: '', date: new Date().toISOString().slice(0,10) });
        await load();
      } catch {
        alert('Saqlashda xatolik');
      }
    }
  };

  const remove = async (row: ExpenseRow) => {
    if (!confirm('O\'chirishni tasdiqlang')) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', row.id);
      if (error) throw error;
      await load();
    } catch (e) {
      // Local fallback delete
      try {
        const local = JSON.parse(localStorage.getItem('expenses') || '[]') as ExpenseRow[];
        const next = local.filter(it => it.id !== row.id);
        localStorage.setItem('expenses', JSON.stringify(next));
        await load();
      } catch {
        alert('O\'chirishda xatolik');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-600">Yuklanmoqda...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <h2 className="text-2xl font-bold text-gray-900">Harajatlar</h2>
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="w-full pl-10 pr-3 py-2 border rounded-lg" />
          </div>
          <select value={dateFilter} onChange={(e)=>{ setDateFilter(e.target.value as any); setSelectedDate(''); }} className="border rounded px-3 py-2">
            <option value="today">Bugun</option>
            <option value="week">Hafta</option>
            <option value="month">Oy</option>
            <option value="all">Barchasi</option>
          </select>
          <input type="date" value={selectedDate} onChange={(e)=>{ setSelectedDate(e.target.value); }} className="border rounded px-3 py-2" />
          <button onClick={()=>setShowForm(true)} className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center min-h-[42px]"><Plus className="w-4 h-4 mr-2"/>Yangi</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-green-900">Jami</span><DollarSign className="w-5 h-5 text-green-600"/></div>
          <div className="text-2xl font-bold text-green-900">{totals.toLocaleString()} so'm</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-blue-900">Qatorlar</span><CreditCard className="w-5 h-5 text-blue-600"/></div>
          <div className="text-2xl font-bold text-blue-900">{filtered.length}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-purple-900">Oxirgi sana</span><Calendar className="w-5 h-5 text-purple-600"/></div>
          <div className="text-2xl font-bold text-purple-900">{filtered[0] ? new Date(filtered[0].expense_date).toLocaleDateString('uz-UZ') : '-'}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-700 border-b"><th className="py-2 text-left">Nomi</th><th className="text-left">Summa</th><th className="text-left">Sana</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-900">{row.name}</td>
                <td>{row.amount.toLocaleString()} so'm</td>
                <td>{new Date(row.expense_date).toLocaleDateString('uz-UZ')}</td>
                <td className="text-right"><button onClick={()=>remove(row)} className="px-3 py-1 bg-red-100 text-red-700 rounded"><Trash2 className="w-4 h-4"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl rounded-none p-4 sm:p-6 overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Harajat qo'shish</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Harajat nomi" className="w-full border rounded px-3 py-2"/>
              <input value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} type="number" placeholder="Summa" className="w-full border rounded px-3 py-2"/>
              <input value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} type="date" className="w-full border rounded px-3 py-2"/>
              <div className="flex gap-2 pt-2 flex-col sm:flex-row"><button onClick={()=>setShowForm(false)} className="flex-1 border rounded px-4 py-2 min-h-[44px]">Bekor</button><button onClick={save} className="flex-1 bg-blue-600 text-white rounded px-4 py-2 min-h-[44px]">Saqlash</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
