import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Building2, Phone, Mail, MapPin, Clock, DollarSign, Plus, Trash2, Users } from 'lucide-react';
import { useRestaurant } from '../../contexts/RestaurantContext';

interface RestaurantSettings {
  restaurant_name: string;
  currency: string;
  tax_rate: number;
  service_charge: number;
  daily_reset_time: string;
  address: string;
  phone: string;
  email: string;
  owner_card_number?: string;
  owner_qr_url?: string;
  logo_url?: string;
}

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { tables, refreshData } = useRestaurant();
  const [settings, setSettings] = useState<RestaurantSettings>({
    restaurant_name: 'Mening Restoranim',
    currency: 'UZS',
    tax_rate: 0,
    service_charge: 0,
    daily_reset_time: '00:00:00',
    address: '',
    phone: '',
    email: '',
    owner_card_number: '',
    owner_qr_url: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local app UI/payment settings
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [backgroundColor, setBackgroundColor] = useState<string>('#f9fafb');
  const [enabledPayments, setEnabledPayments] = useState<{cash:boolean;card:boolean;qr_code:boolean}>({ cash: true, card: true, qr_code: true });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('app_settings') || '{}');
      if (local.theme) setTheme(local.theme);
      if (local.backgroundColor) setBackgroundColor(local.backgroundColor);
      if (local.enabledPayments) setEnabledPayments(local.enabledPayments);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.style.backgroundColor = backgroundColor || '#f9fafb';
  }, [theme, backgroundColor]);

  // Ensure no global background image is applied from this page
  useEffect(() => {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundRepeat = '' as any;
    document.body.style.backgroundPosition = '' as any;
    document.body.style.backgroundSize = '' as any;
    document.body.style.backgroundAttachment = '' as any;
  }, [settings.logo_url]);

  // Auto-cache restaurant settings locally on every change so other pages (receipt) can use immediately
  useEffect(() => {
    try {
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id;
      const payload = { ...settings, restaurant_id: restaurantId } as any;
      localStorage.setItem('restaurant_settings_cache', JSON.stringify(payload));
      window.dispatchEvent(new Event('settings-cache-updated'));
    } catch {}
  }, [settings, profile?.id, (profile as any)?.restaurant_id]);

  const loadSettings = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Apply cached immediately for responsiveness
      try {
        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
        if (cached) {
          setSettings({
            restaurant_name: cached.restaurant_name || 'Mening Restoranim',
            currency: cached.currency || 'UZS',
            tax_rate: Number(cached.tax_rate) || 0,
            service_charge: Number(cached.service_charge) || 0,
            daily_reset_time: cached.daily_reset_time || '00:00:00',
            address: cached.address || '',
            phone: cached.phone || '',
            email: cached.email || '',
            owner_card_number: cached.owner_card_number || '',
            owner_qr_url: cached.owner_qr_url || '',
            logo_url: cached.logo_url || ''
          });
        }
      } catch {}

      const remoteAllowed = localStorage.getItem('restaurant_settings_remote_allowed');
      if (remoteAllowed === 'false') return;

      const rawId: any = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const isUuid = !!(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId));

      let q: any = (supabase as any)
        .from('restaurant_settings' as any)
        .select('*' as any)
        .limit(1);
      if (isUuid) q = (q as any).eq('restaurant_id', rawId);
      const { data, error } = await (q as any).maybeSingle();

      if (error?.code === 'PGRST205') {
        try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
      }

      if (data) {
        setSettings({
          restaurant_name: data.restaurant_name,
          currency: data.currency,
          tax_rate: Number(data.tax_rate) || 0,
          service_charge: Number(data.service_charge) || 0,
          daily_reset_time: data.daily_reset_time || '00:00:00',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          owner_card_number: data.owner_card_number || '',
          owner_qr_url: data.owner_qr_url || '',
          logo_url: (JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null') || {}).logo_url || ''
        });
        try { localStorage.setItem('restaurant_settings_cache', JSON.stringify({ ...(JSON.parse(localStorage.getItem('restaurant_settings_cache')||'{}')), ...data })); } catch {}
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Local fallback cache
      try {
        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
        if (cached) {
          setSettings({
            restaurant_name: cached.restaurant_name || 'Mening Restoranim',
            currency: cached.currency || 'UZS',
            tax_rate: Number(cached.tax_rate) || 0,
            service_charge: Number(cached.service_charge) || 0,
            daily_reset_time: cached.daily_reset_time || '00:00:00',
            address: cached.address || '',
            phone: cached.phone || '',
            email: cached.email || '',
            owner_card_number: cached.owner_card_number || '',
            owner_qr_url: cached.owner_qr_url || ''
          });
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const remoteAllowed = localStorage.getItem('restaurant_settings_remote_allowed');
      const rawId: any = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const isUuid = !!(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId));

      if (remoteAllowed !== 'false') {
        const { data: existing, error: selErr } = await (supabase as any)
          .from('restaurant_settings' as any)
          .select('id')
          .limit(1)
          .maybeSingle();
        if (selErr?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
        }

        if (!selErr) {
          if (existing) {
            const dbSettings: any = { ...settings };
            delete dbSettings.logo_url;
            const { error } = await (supabase as any)
              .from('restaurant_settings' as any)
              .update(dbSettings as any)
              [isUuid ? 'eq' : 'neq']('restaurant_id', isUuid ? rawId : null); // keep API shape; if not uuid, do a no-op eq guard
            if (error) throw error;
          } else {
            const payload: any = { ...settings };
            if (isUuid) payload.restaurant_id = rawId; else payload.restaurant_id = null;
            delete payload.logo_url;
            const { error } = await (supabase as any)
              .from('restaurant_settings' as any)
              .insert(payload as any);
            if (error) throw error;
          }
        }
      }

      try {
        const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id;
        localStorage.setItem('restaurant_settings_cache', JSON.stringify({ ...settings, restaurant_id: restaurantId }));
      } catch {}
      setMessage({ type: 'success', text: 'Sozlamalar muvaffaqiyatli saqlandi!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Sozlamalarni saqlashda xatolik yuz berdi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const saveLocalAppSettings = () => {
    const local = { theme, backgroundColor, enabledPayments };
    localStorage.setItem('app_settings', JSON.stringify(local));
    setMessage({ type: 'success', text: 'Ilova sozlamalari saqlandi va darhol qo\'llandi' });
    setTimeout(() => setMessage(null), 3000);
  };

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
        <h2 className="text-2xl font-bold text-gray-900">Sozlamalar</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Restoran Ma'lumotlari
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restoran Nomi
            </label>
            <input
              type="text"
              value={settings.restaurant_name}
              onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logotip</label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">No logo</div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      setSettings((s) => ({ ...s, logo_url: dataUrl }));
                      try {
                        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || '{}');
                        localStorage.setItem('restaurant_settings_cache', JSON.stringify({ ...cached, logo_url: dataUrl }));
                      } catch {}
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="text-sm"
                />
                {settings.logo_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({ ...s, logo_url: '' }));
                      try {
                        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || '{}');
                        delete cached.logo_url;
                        localStorage.setItem('restaurant_settings_cache', JSON.stringify(cached));
                      } catch {}
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Logoni olib tashlash
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Rasm kompyuterdan yuklanadi va lokal xotirada saqlanadi (internet link talab qilinmaydi).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+998 XX XXX XX XX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="info@restaurant.uz"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Manzil
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={2}
              placeholder="Toshkent shahar..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ilova Sozlamalari</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mavzu</label>
              <select value={theme} onChange={e=>setTheme(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="light">Yorug'</option>
                <option value="dark">Qorong'u</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fon Rangi</label>
              <input type="color" value={backgroundColor} onChange={e=>setBackgroundColor(e.target.value)} className="w-16 h-10 border rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To'lov Usullari</label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={enabledPayments.cash} onChange={e=>setEnabledPayments(p=>({...p, cash: e.target.checked}))}/> Naqd</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={enabledPayments.card} onChange={e=>setEnabledPayments(p=>({...p, card: e.target.checked}))}/> Karta</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={enabledPayments.qr_code} onChange={e=>setEnabledPayments(p=>({...p, qr_code: e.target.checked}))}/> QR (klik)</label>
            </div>
          </div>
          <div>
            <button onClick={saveLocalAppSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Ilova Sozlamalarini Saqlash</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Moliyaviy Sozlamalar
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ega Karta Raqami</label>
              <input
                type="text"
                value={settings.owner_card_number}
                onChange={(e) => setSettings({ ...settings, owner_card_number: e.target.value })}
                placeholder="8600 xxxx xxxx xxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ega QR URL</label>
              <input
                type="text"
                value={settings.owner_qr_url}
                onChange={(e) => setSettings({ ...settings, owner_qr_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valyuta
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="UZS">O'zbek So'mi (UZS)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soliq Stavkasi (%)
              </label>
              <input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xizmat Haqqi (%)
              </label>
              <input
                type="number"
                value={settings.service_charge}
                onChange={(e) => setSettings({ ...settings, service_charge: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Ish Vaqti Sozlamalari
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kunlik Qayta Tiklash Vaqti
            </label>
            <input
              type="time"
              value={settings.daily_reset_time}
              onChange={(e) => setSettings({ ...settings, daily_reset_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Har kuni ushbu vaqtda ma'lumotlar avtomatik yangilanadi va eski ma'lumotlar tarixga o'tkaziladi
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center"><Users className="w-5 h-5 mr-2"/>Stollarni Boshqarish</h3>
          <button
            onClick={async () => {
              const nextNumber = (tables[tables.length-1]?.number || 0) + 1;
              try {
                const { error } = await (supabase as any)
                  .from('tables' as any)
                  .insert({ number: nextNumber, seats: 4, status: 'available', restaurant_id: ((profile as any)?.restaurant_id || (profile as any)?.id) })
                  .select()
                  .single();
                if (error) throw error;
                await refreshData();
              } catch (e) {
                console.error(e);
                alert('Stol qo\'shishda xatolik');
              }
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-1"/> Stol Qo'shish
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map(t => (
              <div key={t.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="font-medium">{t.number}-stol</div>
                <button
                  onClick={async () => {
                    if (!confirm('Bu stolni o\'chirasizmi?')) return;
                    try {
                      const { error } = await supabase.from('tables').delete().eq('id', t.id);
                      if (error) throw error;
                      await refreshData();
                    } catch (e) {
                      console.error(e);
                      alert('Stolni o\'chirishda xatolik');
                    }
                  }}
                  className="p-1 bg-red-100 text-red-700 rounded"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saqlanmoqda...' : 'Sozlamalarni Saqlash'}
        </button>
      </div>
    </div>
  );
};
