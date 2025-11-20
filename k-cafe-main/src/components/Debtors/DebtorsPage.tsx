import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, CheckCircle2 } from 'lucide-react';

const isUUID = (v: string | null | undefined) =>
  !!(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v));

interface Debtor {
  id: string;
  name: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  phone: string | null;
  created_at: string;
}

export const DebtorsPage: React.FC = () => {
  const { profile } = useAuth();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', amount: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', amount: '', due_date: '' });

  const loadDebtors = async () => {
    setLoading(true);
    try {
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id;
      let q: any = (supabase as any).from('debtors').select('*').order('created_at', { ascending: false });
      if (restaurantId) q = q.eq('restaurant_id', restaurantId);
      const { data, error } = await q;
      if (error) throw error;
      setDebtors((data || []) as any);
    } catch (e) {
      console.error('Failed to load debtors', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtors();
  }, []);

  const totalUnpaid = useMemo(() => {
    return debtors.filter(d => !d.paid).reduce((s, d) => s + Number(d.amount || 0), 0);
  }, [debtors]);

  const isDueToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
        amount: Number(form.amount),
        due_date: form.due_date ? new Date(form.due_date).toISOString().slice(0,10) : null,
        paid: false,
        restaurant_id: restaurantId,
        created_by: (isUUID(profile?.id) ? profile?.id : null),
        created_at: new Date().toISOString()
      };
      const supaAny: any = supabase;
      const { error } = await supaAny.from('debtors').insert(payload);
      if (error) throw error;
      setForm({ name: '', phone: '', amount: '', due_date: '' });
      await loadDebtors();
    } catch (e: any) {
      console.error('Failed to add debtor', e);
      const msg = e?.message || 'Ma\'lumotni saqlashda xatolik yuz berdi';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const supaAny2: any = supabase;
      const { error } = await supaAny2
        .from('debtors')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await loadDebtors();
    } catch (e: any) {
      console.error('Failed to mark as paid', e);
      const msg = e?.message || "To'langan deb belgilashda xatolik";
      setErrorMessage(msg);
    }
  };

  const beginEdit = (d: Debtor) => {
    setEditingId(d.id);
    setEditForm({
      name: d.name || '',
      phone: d.phone || '',
      amount: String(d.amount ?? ''),
      due_date: d.due_date ? new Date(d.due_date).toISOString().slice(0,10) : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', phone: '', amount: '', due_date: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const payload: any = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() ? editForm.phone.trim() : null,
        amount: Number(editForm.amount),
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString().slice(0,10) : null
      };
      const supaAny: any = supabase;
      const { error } = await supaAny.from('debtors').update(payload).eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      setEditForm({ name: '', phone: '', amount: '', due_date: '' });
      await loadDebtors();
    } catch (e: any) {
      console.error('Failed to update debtor', e);
      const msg = e?.message || 'Ma\'lumotni yangilashda xatolik yuz berdi';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteDebtor = async (id: string) => {
    setErrorMessage('');
    try {
      const supaAny: any = supabase;
      const { error } = await supaAny.from('debtors').delete().eq('id', id);
      if (error) throw error;
      await loadDebtors();
    } catch (e: any) {
      console.error('Failed to delete debtor', e);
      const msg = e?.message || 'Ma\'lumotni o\'chirishda xatolik';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qarzdorlar</h1>
          <p className="text-sm text-gray-600">Qarzdorlar ro\'yxati va umumiy hisob</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold">
          Umumiy (to'lanmagan): {totalUnpaid.toLocaleString()} so'm
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Qarzdor ismi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: +99890XXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qarz summasi</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: 150000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To'lash sanasi</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60 min-h-[42px]"
            >
              <Plus className="w-4 h-4" /> Qo'shish
            </button>
          </div>
        </div>
      </form>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
          <p className="text-sm font-medium">Xatolik: {errorMessage}</p>
          <p className="text-xs text-red-600 mt-1">
            Agar jadval mavjud bo'lmasa, Supabase Studio SQL oynasida `debtors` jadvali migratsiyasini qo'llang.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ism</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qarz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">To'lash sanasi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Holat</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Yuklanmoqda...</td>
                </tr>
              ) : debtors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Qarzdorlar yo'q</td>
                </tr>
              ) : (
                debtors.map((d) => (
                  <tr key={d.id} className={(!d.paid && isDueToday(d.due_date)) ? 'bg-red-50' : ''}>
                    {editingId === d.id ? (
                      <>
                        <td className={`px-4 py-3 text-sm font-medium`}>
                          <input type="text" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-2 py-1" />
                        </td>
                        <td className={`px-4 py-3 text-sm hidden sm:table-cell`}>
                          <input type="tel" value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-2 py-1" />
                        </td>
                        <td className={`px-4 py-3 text-sm`}>
                          <input type="number" step="0.01" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-2 py-1" />
                        </td>
                        <td className={`px-4 py-3 text-sm hidden sm:table-cell`}>
                          <input type="date" value={editForm.due_date} onChange={e=>setEditForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-2 py-1" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`px-4 py-3 text-sm font-medium ${(!d.paid && isDueToday(d.due_date)) ? 'text-red-700' : 'text-gray-900'}`}>
                          {d.name}
                        </td>
                        <td className={`px-4 py-3 text-sm ${(!d.paid && isDueToday(d.due_date)) ? 'text-red-700' : 'text-gray-900'} hidden sm:table-cell`}>
                          {d.phone || '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${(!d.paid && isDueToday(d.due_date)) ? 'text-red-700' : 'text-gray-900'}`}>
                          {Number(d.amount).toLocaleString()} so'm
                        </td>
                        <td className={`px-4 py-3 text-sm ${(!d.paid && isDueToday(d.due_date)) ? 'text-red-700' : 'text-gray-700'} hidden sm:table-cell`}>
                          {d.due_date ? new Date(d.due_date).toLocaleDateString('uz-UZ') : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">
                      {d.paid ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> To'langan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-800 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">
                          Kutilmoqda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end gap-2 flex-wrap sm:flex-nowrap">
                      {editingId === d.id ? (
                        <>
                          <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]">Saqlash</button>
                          <button onClick={cancelEdit} type="button" className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]">Bekor qilish</button>
                        </>
                      ) : (
                        <>
                          {!d.paid && (
                            <button
                              onClick={() => markAsPaid(d.id)}
                              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]"
                            >
                              <CheckCircle2 className="w-4 h-4" /> <span className="hidden xs:inline">To'landi</span>
                            </button>
                          )}
                          <button onClick={() => beginEdit(d)} className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]">Tahrirlash</button>
                          <button onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteDebtor(d.id); }} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]">O'chirish</button>
                        </>
                      )}
                      </div>
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
}
