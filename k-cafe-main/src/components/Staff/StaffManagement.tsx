import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Search, User, DollarSign, Calendar, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StaffRow {
  id: string;
  name: string;
  login: string;
  role: 'waiter' | 'manager';
  daily_wage: number;
  is_active: boolean;
  created_at: string;
}

interface WagePaymentRow {
  id: string;
  staff_id: string;
  amount: number;
  paid_date: string;
  note?: string | null;
}

export const StaffManagement: React.FC = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ id?: string; name: string; login: string; password: string; role: 'waiter' | 'manager'; daily_wage: string }>(
    { name: '', login: '', password: '', role: 'waiter', daily_wage: '0' }
  );
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [payModal, setPayModal] = useState<{ staff?: StaffRow; amount: string; note: string } | null>(null);
  const [payments, setPayments] = useState<WagePaymentRow[]>([]);
  const [todayTotals, setTodayTotals] = useState<Record<string, number>>({});

  const readLS = <T,>(key: string, def: T): T => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; }
  };
  const writeLS = (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      let query: any = supabase.from('staff' as any).select('*').order('created_at', { ascending: false });
      if (profile?.id) {
        query = query.eq('restaurant_id', profile.id as any);
      }
      const { data, error } = await query as any;
      if (error) throw error;
      setList((data as any[]) || []);

      // compute today's sales per waiter
      const today = new Date().toISOString().split('T')[0];
      const { data: todayOrders } = await supabase
        .from('orders' as any)
        .select('waiter_id, total_amount, payment_status, completed_at')
        .eq('payment_status', 'paid')
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);
      const totals: Record<string, number> = {};
      ((todayOrders as any[]) || []).forEach((o: any) => {
        if (o.waiter_id) totals[o.waiter_id] = (totals[o.waiter_id] || 0) + Number(o.total_amount);
      });
      setTodayTotals(totals);
    } catch (e) {
      const cached = readLS<StaffRow[]>('staff', []);
      setList(cached);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.login.toLowerCase().includes(search.toLowerCase())), [list, search]);

  const openCreate = () => { setForm({ name: '', login: '', password: '', role: 'waiter', daily_wage: '0' }); setShowPassword(false); setShowForm(true); };

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(2, 8) + Math.floor(100+Math.random()*900);
    setForm(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const saveStaff = async () => {
    const name = form.name.trim();
    const login = form.login.trim();
    const role = form.role;
    const dailyWage = parseFloat(form.daily_wage || '0');
    const isCreating = !form.id;

    if (!name || !login) {
      return alert('Ism va kirish (login) majburiy.');
    }
    if (role === 'waiter' && isCreating && !form.password) {
      return alert('Afitsant uchun parol kiriting yoki yaratib oling.');
    }

    const payload: any = { name, login, role, daily_wage: dailyWage };
    if (profile?.id) payload.restaurant_id = profile.id;
    if (isCreating || (form.password && form.password.trim())) {
      payload.password = form.password.trim();
    }

    try {
      if (isCreating) {
        let dupQ: any = supabase.from('staff' as any).select('id').eq('login', login);
        if (profile?.id) dupQ = dupQ.eq('restaurant_id', profile.id as any);
        const { data: existing, error: dupErr } = await dupQ.maybeSingle();
        if (dupErr) throw dupErr;
        if (existing) return alert('Bu login allaqachon mavjud.');
        if (payload.is_active === undefined) payload.is_active = true;
        const { error } = await supabase.from('staff' as any).insert(payload as any);
        if (error) throw error;
      } else {
        const staffTable: any = (supabase as any).from('staff' as any);
        const { error } = await (staffTable.update as any)(payload as any).eq('id', form.id as any);
        if (error) throw error;
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      const cached = readLS<any[]>('staff', []);
      if (!form.id) {
        const id = Date.now().toString();
        const localRow: any = {
          id,
          name,
          login,
          password: payload.password || '',
          role,
          daily_wage: dailyWage || 0,
          is_active: true,
          created_at: new Date().toISOString()
        };
        const next = [localRow, ...cached];
        writeLS('staff', next);
        setList(next as any);
      } else {
        const next = cached.map((s: any) => s.id === form.id ? {
          ...s,
          name,
          login,
          role,
          daily_wage: dailyWage || 0,
          password: payload.password ? payload.password : s.password
        } : s);
        writeLS('staff', next);
        setList(next as any);
      }
      setShowForm(false);
    }
  };

  const toggleActive = async (row: StaffRow) => {
    try {
      const staffTable: any = (supabase as any).from('staff' as any);
      const { error } = await (staffTable.update as any)({ is_active: !row.is_active } as any).eq('id', row.id as any);
      if (error) throw error;
      await load();
    } catch (err: any) {
      const cached = readLS<StaffRow[]>('staff', []);
      const next = cached.map(s => s.id === row.id ? { ...s, is_active: !row.is_active } : s);
      writeLS('staff', next);
      setList(next);
    }
  };

  const removeStaff = async (row: StaffRow) => {
    if (!confirm('O\'chirishni tasdiqlang')) return;
    try {
      const { error } = await supabase.from('staff' as any).delete().eq('id', row.id as any);
      if (error) throw error;
      await load();
    } catch (err: any) {
      const cached = readLS<StaffRow[]>('staff', []);
      const next = cached.filter(s => s.id !== row.id);
      writeLS('staff', next);
      setList(next);
    }
  };

  const openPay = async (row: StaffRow) => {
    setPayModal({ staff: row, amount: String(row.daily_wage || 0), note: '' });
    try {
      const { data } = await supabase.from('wage_payments' as any).select('*').eq('staff_id', row.id as any).order('paid_date', { ascending: false }) as any;
      setPayments((data as any[]) || []);
    } catch {
      const local = readLS<WagePaymentRow[]>('wage_payments', []);
      setPayments(local.filter(p => p.staff_id === row.id));
    }
  };

  const submitPayment = async () => {
    if (!payModal?.staff) return;
    try {
      const { error } = await supabase.from('wage_payments' as any).insert({ staff_id: payModal.staff.id, amount: parseFloat(payModal.amount || '0'), note: payModal.note, paid_by: profile?.name || 'admin' } as any);
      if (error) throw error;
      await openPay(payModal.staff);
    } catch (err: any) {
      const rec: WagePaymentRow = { id: Date.now().toString(), staff_id: payModal.staff.id, amount: parseFloat(payModal.amount || '0'), note: payModal.note, paid_date: new Date().toISOString() };
      const cached = readLS<WagePaymentRow[]>('wage_payments', []);
      const next = [rec, ...cached];
      writeLS('wage_payments', next);
      await openPay(payModal.staff);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-600">Yuklanmoqda...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <h2 className="text-2xl font-bold text-gray-900">Xodimlarni Boshqarish</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="w-full pl-10 pr-3 py-2 border rounded-lg" />
          </div>
          <button onClick={openCreate} className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center min-h-[42px]"><Plus className="w-4 h-4 mr-2"/>Yangi Xodim</button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-700 border-b"><th className="py-2 text-left">Ismi</th><th className="text-left">Login</th><th className="text-left">Rol</th><th className="text-left">Bugun Savdo</th><th className="text-left">Kunlik Maosh</th><th className="text-left">Holat</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-900 flex items-center"><User className="w-4 h-4 mr-2"/>{row.name}</td>
                <td>{row.login}</td>
                <td className="capitalize">{row.role}</td>
                <td>{(todayTotals[row.id] || 0).toLocaleString()} so'm</td>
                <td>{row.daily_wage.toLocaleString()} so'm</td>
                <td>
                  <button onClick={() => toggleActive(row)} className={`px-2 py-1 rounded text-xs ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.is_active ? 'Active' : 'Inactive'}</button>
                </td>
                <td className="text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setForm({ id: row.id, name: row.name, login: row.login, password: '', role: row.role, daily_wage: String(row.daily_wage) }); setShowForm(true); }} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => openPay(row)} className="px-3 py-1 bg-green-100 text-green-800 rounded flex items-center"><DollarSign className="w-4 h-4 mr-1"/>To'lash</button>
                    <button onClick={() => removeStaff(row)} className="px-3 py-1 bg-red-100 text-red-700 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl rounded-none p-4 sm:p-6 overflow-auto">
            <h3 className="text-lg font-semibold mb-4">{form.id ? 'Xodimni Tahrirlash' : 'Yangi Xodim'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Ism Familiya</label>
                <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Ism Familiya" className="w-full border rounded px-3 py-2"/>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Kirish (telefon/login)</label>
                <input value={form.login} onChange={(e)=>setForm({...form, login: e.target.value})} placeholder="Kirish (telefon yoki login)" className="w-full border rounded px-3 py-2"/>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-700 mb-1">Parol {form.role==='waiter' && !form.id ? '(Afitsant uchun majburiy)' : '(bo\'sh qoldirsangiz o\'zgarmaydi)'}</label>
                  <button type="button" onClick={generatePassword} className="text-xs text-blue-600 hover:underline">Parol yaratish</button>
                </div>
                <div className="flex gap-2">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="Parol" className="w-full border rounded px-3 py-2"/>
                  <button type="button" onClick={()=>setShowPassword(s=>!s)} className="px-3 py-2 border rounded text-sm">{showPassword ? 'Yashirish' : 'Ko\'rsatish'}</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Afitsantlar ushbu <b>login</b> va <b>parol</b> bilan tizimga kirib buyurtma qabul qilishadi.</p>
              </div>
              <div className="flex gap-2">
                <select value={form.role} onChange={(e)=>setForm({...form, role: e.target.value as any})} className="flex-1 border rounded px-3 py-2">
                  <option value="waiter">Afitsant</option>
                  <option value="manager">Boshliq</option>
                </select>
                <input value={form.daily_wage} onChange={(e)=>setForm({...form, daily_wage: e.target.value})} type="number" placeholder="Kunlik maosh" className="flex-1 border rounded px-3 py-2"/>
              </div>
              <div className="flex gap-2 pt-2 flex-col sm:flex-row">
                <button onClick={()=>setShowForm(false)} className="flex-1 border rounded px-4 py-2 min-h-[44px]">Bekor</button>
                <button onClick={saveStaff} className="flex-1 bg-blue-600 text-white rounded px-4 py-2 min-h-[44px]">Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {payModal?.staff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-xl rounded-none p-4 sm:p-6 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Kunlik Maosh To'lash</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Xodim</label>
                <div className="font-medium">{payModal.staff.name}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Summa</label>
                <input value={payModal.amount} onChange={(e)=>setPayModal({...payModal, amount: e.target.value})} type="number" className="w-full border rounded px-3 py-2"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Izoh</label>
                <input value={payModal.note} onChange={(e)=>setPayModal({...payModal, note: e.target.value})} className="w-full border rounded px-3 py-2"/>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 flex-col sm:flex-row">
              <button onClick={()=>setPayModal(null)} className="px-4 py-2 border rounded min-h-[44px]">Yopish</button>
              <button onClick={submitPayment} className="px-4 py-2 bg-green-600 text-white rounded flex items-center min-h-[44px]"><Check className="w-4 h-4 mr-1"/>To'landi</button>
            </div>
            <div className="mt-6">
              <h4 className="font-semibold mb-2 flex items-center"><Calendar className="w-4 h-4 mr-2"/>To'lov Tarixi</h4>
              <div className="max-h-60 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 px-3">Sana</th><th className="text-left px-3">Summa</th><th className="text-left px-3">Izoh</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2 px-3">{new Date(p.paid_date).toLocaleDateString('uz-UZ')}</td>
                        <td className="px-3">{p.amount.toLocaleString()} so'm</td>
                        <td className="px-3">{p.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
