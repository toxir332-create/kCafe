import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, QrCode, Receipt, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Order {
  id: string;
  table_id: string;
  status: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  special_instructions?: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_requests?: string;
}

interface CheckoutModalProps {
  order: Order;
  orderItems: OrderItem[];
  tableNumber: number;
  onClose: () => void;
  onCheckout: (paymentMethod: string) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  order,
  orderItems,
  tableNumber,
  onClose,
  onCheckout
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(false);
  // removed unused qrCodeData
  const [ownerCard, setOwnerCard] = useState<string>('');

  useEffect(() => {
    (async () => {
      // Prefer cached settings and avoid repeated 404s if relation is missing
      try {
        const remoteAllowed = localStorage.getItem('restaurant_settings_remote_allowed');
        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
        if (cached?.owner_card_number) {
          setOwnerCard(cached.owner_card_number);
        }
        if (remoteAllowed === 'false') return;

        const { data, error }: any = await (supabase as any)
          .from('restaurant_settings' as any)
          .select('owner_card_number, owner_qr_url' as any)
          .limit(1)
          .maybeSingle();
        if (error?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
        }
        setOwnerCard(data?.owner_card_number || cached?.owner_card_number || '');
      } catch (e: any) {
        // If missing relation, permanently disable remote for this session
        if (e?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
        }
        // keep cached value or empty
      }
    })();
    if (selectedPaymentMethod === 'qr_code') {
      // data prepared but no external QR service call here to avoid network errors
      setShowQRCode(true);
    } else {
      setShowQRCode(false);
    }
  }, [selectedPaymentMethod, order.id, order.total_amount, tableNumber]);

  const handleCheckout = async () => {
    if (!selectedPaymentMethod) return;

    setLoading(true);
    try {
      await onCheckout(selectedPaymentMethod);
      // Parent (TableOrderView) will close this modal after checkout
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Read enabled payment methods from local settings
  const getEnabledPaymentMethods = () => {
    try {
      const local = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const enabled = local.enabledPayments || { cash: true, card: true, qr_code: true };
      const all = [
        { id: 'cash', name: 'Naqd Pul', icon: Banknote, color: 'green', enabled: !!enabled.cash },
        { id: 'card', name: 'Bank Kartasi', icon: CreditCard, color: 'blue', enabled: !!enabled.card },
        { id: 'qr_code', name: 'QR Kod', icon: QrCode, color: 'purple', enabled: !!enabled.qr_code }
      ];
      return all.filter(m => m.enabled);
    } catch {
      return [
        { id: 'cash', name: 'Naqd Pul', icon: Banknote, color: 'green' },
        { id: 'card', name: 'Bank Kartasi', icon: CreditCard, color: 'blue' },
        { id: 'qr_code', name: 'QR Kod', icon: QrCode, color: 'purple' }
      ];
    }
  };

  const paymentMethods = getEnabledPaymentMethods();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Hisob To'lash</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Stol:</span>
              <span className="font-semibold text-gray-900">{tableNumber}-stol</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Buyurtma ID:</span>
              <span className="text-xs font-mono text-gray-500">{order.id.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 mb-3">Buyurtma Tarkibi:</h3>
            {orderItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.menu_item_name}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} × {item.unit_price.toLocaleString()} so'm
                  </p>
                  {item.special_requests && (
                    <p className="text-xs text-gray-500 italic mt-1">{item.special_requests}</p>
                  )}
                </div>
                <p className="font-semibold text-gray-900 ml-4">
                  {item.subtotal.toLocaleString()} so'm
                </p>
              </div>
            ))}
          </div>

          {order.special_instructions && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-1">Maxsus Ko'rsatmalar:</p>
              <p className="text-sm text-blue-900">{order.special_instructions}</p>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Jami:</span>
              <span className="text-2xl font-bold text-blue-600">
                {Number((orderItems || []).reduce((s, it) => s + Number(it.subtotal || (Number(it.unit_price) * Number(it.quantity) || 0)), 0)).toLocaleString()} so'm
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">To'lov Usulini Tanlang:</h3>
            <div className="space-y-2">
            {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod === method.id
                      ? `border-${method.color}-500 bg-${method.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedPaymentMethod === method.id
                      ? `bg-${method.color}-100`
                      : 'bg-gray-100'
                  }`}>
                    <method.icon className={`w-5 h-5 ${
                      selectedPaymentMethod === method.id
                        ? `text-${method.color}-600`
                        : 'text-gray-600'
                    }`} />
                  </div>
                  <span className={`ml-3 font-medium ${
                    selectedPaymentMethod === method.id
                      ? 'text-gray-900'
                      : 'text-gray-700'
                  }`}>
                    {method.name}
                  {method.id === 'qr_code' && ownerCard && (
                    <span className="ml-2 text-xs text-gray-500">({ownerCard})</span>
                  )}
                  </span>
                  {selectedPaymentMethod === method.id && (
                    <Check className={`ml-auto w-5 h-5 text-${method.color}-600`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {showQRCode && (
            <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                  <QrCode className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">QR Kodni Skanerlang</h4>
                <p className="text-sm text-gray-600 mb-4">
                  To'lovni amalga oshirish uchun quyidagi QR kodni skanerlang
                </p>
                <div className="bg-white p-4 rounded-lg inline-block border border-gray-200">
                  <div className="w-48 h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-32 h-32 text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">QR Kod</p>
                      <p className="text-xs font-mono text-gray-500 mt-1">
                        {order.total_amount.toLocaleString()} so'm
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Buyurtma ID: {order.id.slice(0, 8)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            >
              Bekor Qilish
            </button>
            <button
              onClick={handleCheckout}
              disabled={!selectedPaymentMethod || loading}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {loading ? (
                'Kutilmoqda...'
              ) : (
                <>
                  <Receipt className="w-5 h-5 mr-2" />
                  To'lashni Tasdiqlash
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
