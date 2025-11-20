import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingCart, Receipt, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CheckoutModal } from './CheckoutModal';
import { OrderModal } from './OrderModal';
import { ReceiptPrint } from './ReceiptPrint';
import { useAuth } from '../../contexts/AuthContext';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied';
}

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

interface TableOrderViewProps {
  table: Table;
  onClose: () => void;
  onRefresh: () => void;
}

export const TableOrderView: React.FC<TableOrderViewProps> = ({ table, onClose, onRefresh }) => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ card?: string; qr?: string; name?: string; phone?: string; address?: string }>({});
  const [receiptItems, setReceiptItems] = useState<OrderItem[] | null>(null);

  const persistClosedReceipt = async (opts: {
    orderId: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    completedAtISO: string;
  }) => {
    const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
    const payload: any = {
      order_id: opts.orderId,
      restaurant_id: restaurantId,
      items: opts.items.map(i => ({
        id: i.id,
        menu_item_name: i.menu_item_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        special_requests: i.special_requests ?? null
      })),
      total_amount: opts.total,
      payment_method: opts.paymentMethod,
      completed_at: opts.completedAtISO,
      created_at: new Date().toISOString()
    } as any;

    try {
      const supaAny: any = supabase as any;
      const { error } = await supaAny
        .from('order_receipts' as any)
        .insert(payload as any);
      if (error) throw error;
    } catch (e) {
      // Fallback to local durable cache
      try {
        const local = JSON.parse(localStorage.getItem('closed_receipts') || '[]');
        local.unshift(payload);
        localStorage.setItem('closed_receipts', JSON.stringify(local));
      } catch {}
    }
  };

  useEffect(() => {
    loadOrders();
  }, [table.id]);

  useEffect(() => {
    (async () => {
      try {
        // Apply cached settings immediately
        try {
          const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
          if (cached) {
            setOwnerInfo({
              card: cached.owner_card_number || '',
              qr: cached.owner_qr_url || '',
              name: cached.restaurant_name || '',
              phone: cached.phone || '',
              address: cached.address || ''
            });
          }
        } catch {}

        const remoteAllowed = localStorage.getItem('restaurant_settings_remote_allowed');
        if (remoteAllowed === 'false') return;

        const rawId: any = (profile as any)?.restaurant_id || (profile as any)?.id || null;
        const isUuid = !!(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId));
        let q: any = (supabase as any)
          .from('restaurant_settings' as any)
          .select('owner_card_number, owner_qr_url, restaurant_name, phone, address' as any)
          .limit(1);
        if (isUuid) q = (q as any).eq('restaurant_id', rawId);
        const { data, error }: any = await (q as any).maybeSingle();
        if (error?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
        }
        if (data) {
          setOwnerInfo({
            card: data?.owner_card_number || '',
            qr: data?.owner_qr_url || '',
            name: data?.restaurant_name || '',
            phone: data?.phone || '',
            address: data?.address || ''
          });
          try {
            localStorage.setItem(
              'restaurant_settings_cache',
              JSON.stringify({ ...(JSON.parse(localStorage.getItem('restaurant_settings_cache')||'{}')), ...data })
            );
          } catch {}
        }
      } catch (e: any) {
        if (e?.code === 'PGRST205') {
          try { localStorage.setItem('restaurant_settings_remote_allowed', 'false'); } catch {}
        }
      }
    })();
  }, [profile?.id, (profile as any)?.restaurant_id]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', table.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData);

        const orderIds = ordersData.map((o: any) => o.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const itemsByOrder: Record<string, OrderItem[]> = {};
        itemsData?.forEach((item: any) => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });
        setOrderItems(itemsByOrder);
      } else {
        setOrders([]);
        setOrderItems({});
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      // Local fallback
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
      const tableOrders = localOrders
        .filter(o => o.table_id === table.id && ['pending','preparing','ready'].includes(o.status))
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(tableOrders);
      const localItems = JSON.parse(localStorage.getItem('order_items') || '[]') as any[];
      const itemsByOrder: Record<string, OrderItem[]> = {};
      localItems.filter(i => tableOrders.some(o => o.id === i.order_id)).forEach(i => {
        if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [] as any;
        itemsByOrder[i.order_id].push(i);
      });
      setOrderItems(itemsByOrder);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrderItem = async (orderId: string, itemId: string) => {
    if (!confirm('Bu mahsulotni buyurtmadan o\'chirmoqchimisiz?')) return;

    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const remainingItems = orderItems[orderId].filter(item => item.id !== itemId);

      if (remainingItems.length === 0) {
        await supabase.from('orders').delete().eq('id', orderId);
        await loadOrders();
        onRefresh();
      } else {
        const newTotal = remainingItems.reduce((sum, item) => sum + item.subtotal, 0);
        const supabaseAny: any = supabase;
        await supabaseAny
          .from('orders')
          .update({ total_amount: newTotal })
          .eq('id', orderId);

        await loadOrders();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Mahsulotni o\'chirishda xatolik');
    }
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!selectedOrder) return;

    try {
      const supabaseAny2: any = supabase;
      const finalTotal = computeOrderTotal(selectedOrder.id, Number(selectedOrder.total_amount || 0));

      // Call backend RPC to close order transactionally
      const { error: rpcError } = await supabaseAny2.rpc('checkout_order', {
        p_order_id: selectedOrder.id,
        p_payments: [{ method: paymentMethod, amount: finalTotal, ext_ref: selectedOrder.id }]
      });
      if (rpcError) throw rpcError;

      // Persist durable snapshot of the closed check
      await persistClosedReceipt({
        orderId: selectedOrder.id,
        items: orderItems[selectedOrder.id] || [],
        total: finalTotal,
        paymentMethod,
        completedAtISO: new Date().toISOString()
      });

      // 2) Check if there are any remaining open orders for this table
      const { data: remainingOrders, error: checkError } = await supabaseAny2
        .from('orders')
        .select('id')
        .eq('table_id', table.id)
        .eq('status', 'open');

      if (checkError) throw checkError;

      // 3) Only mark table as available if there are no remaining open orders
      if (!remainingOrders || remainingOrders.length === 0) {
        const supabaseAny3: any = supabase;
        await supabaseAny3
          .from('tables')
          .update({ status: 'available', currentOrder: null })
          .eq('id', table.id);
      }

      // Preserve current order items for receipt before reloading state
      setReceiptItems(orderItems[selectedOrder.id] || []);
      setShowCheckout(false);
      setShowReceipt(true);

      // Defer reload until after printing/closing receipt to keep data visible
    } catch (error) {
      console.error('Error during checkout:', error);
      // Local fallback update
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
      // Close selected order
      const idx = localOrders.findIndex((o: any) => o.id === selectedOrder.id);
      if (idx >= 0) {
        localOrders[idx] = {
          ...localOrders[idx],
          status: 'served',
          payment_status: 'paid',
          payment_method: paymentMethod,
          completed_at: new Date().toISOString()
        };
      }
      localStorage.setItem('orders', JSON.stringify(localOrders));

      // Check if there are any remaining open orders for this table
      const remainingOpenOrders = localOrders.filter((o: any) => 
        o.table_id === table.id && 
        o.id !== selectedOrder.id && 
        o.status === 'open'
      );

      // Only mark table as available if there are no remaining open orders
      if (remainingOpenOrders.length === 0) {
        const localTables = JSON.parse(localStorage.getItem('tables') || '[]') as any[];
        const tIdx = localTables.findIndex((t: any) => t.id === table.id);
        if (tIdx >= 0) {
          localTables[tIdx] = { ...localTables[tIdx], status: 'available', currentOrder: null };
          localStorage.setItem('tables', JSON.stringify(localTables));
        }
      }

      // Preserve current order items for receipt before reloading state
      setReceiptItems(orderItems[selectedOrder.id] || []);
      setShowCheckout(false);
      setShowReceipt(true);
    }
  };

  const handleAddMoreItems = () => {
    setShowAddOrder(true);
  };

  const applyOwnerFromCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
      if (cached) {
        setOwnerInfo({
          card: cached.owner_card_number || '',
          qr: cached.owner_qr_url || '',
          name: cached.restaurant_name || '',
          phone: cached.phone || '',
          address: cached.address || ''
        });
      }
    } catch {}
  };

  const computeOrderTotal = (orderId: string, fallback?: number) => {
    const items = orderItems[orderId] || [];
    if (items.length > 0) {
      const tot = items.reduce((s, it) => s + Number(it.subtotal || (Number(it.unit_price) * Number(it.quantity) || 0)), 0);
      return Number.isFinite(tot) ? tot : 0;
    }
    return Number(fallback || 0);
  };

  const getTotalAmount = () => {
    if (!orders || orders.length === 0) return 0;
    return orders.reduce((sum, order) => sum + computeOrderTotal(order.id, Number(order.total_amount || 0)), 0);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Add error boundary to prevent crashes
  try {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-hidden flex flex-col rounded-none sm:rounded-xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                {table.number}-stol
              </h2>
              <p className="text-sm text-gray-600">{table.seats} o'rin</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
            {!orders || orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Buyurtma yo'q</p>
                <p className="text-gray-400 text-sm mt-2">Bu stolga yangi buyurtma qo'shing</p>
              </div>
            ) : (
              orders?.map((order, orderIndex) => (
                <div key={order.id} className="bg-gray-50 rounded-xl p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Buyurtma #{orderIndex + 1}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'pending' ? 'Kutilmoqda' :
                       order.status === 'preparing' ? 'Tayyorlanmoqda' :
                       order.status === 'ready' ? 'Tayyor' : order.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {orderItems[order.id]?.map((item, itemIndex) => (
                      <div key={item.id} className="bg-white rounded-lg p-3 border-l-4 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                {itemIndex + 1}
                              </span>
                              <h4 className="font-semibold text-gray-900">{item.menu_item_name}</h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                Miqdor: <span className="font-semibold text-gray-900">{item.quantity}</span>
                              </span>
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                Narx: <span className="font-semibold text-gray-900">{item.unit_price.toLocaleString()} so'm</span>
                              </span>
                            </div>
                            {item.special_requests && (
                              <p className="text-xs text-gray-500 italic mt-2 bg-yellow-50 p-2 rounded">
                                <span className="font-medium">Maxsus talab:</span> {item.special_requests}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2 sm:ml-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {item.subtotal.toLocaleString()} so'm
                              </div>
                              <div className="text-xs text-gray-500">
                                Jami
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteOrderItem(order.id, item.id)}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-blue-800 mb-1">Maxsus Ko'rsatmalar:</p>
                      <p className="text-sm text-blue-900">{order.special_instructions}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Buyurtma Jami:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {Number(computeOrderTotal(order.id, Number(order.total_amount || 0))).toLocaleString()} so'm
                    </span>
                  </div>

                  <div className="flex gap-2 mt-4 flex-col sm:flex-row">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        applyOwnerFromCache();
                        setReceiptItems(orderItems[order.id] || []);
                        setShowReceipt(true);
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center min-h-[42px]"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Chek Chqarish
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowCheckout(true);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center min-h-[42px]"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      To'lash va Yopish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-6 space-y-4">
            {orders && orders.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Umumiy Jami:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalAmount().toLocaleString()} so'm
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={() => {
                  // Print receipt for all orders on this table
                  const allItems: OrderItem[] = [];
                  orders.forEach(order => {
                    const items = orderItems[order.id] || [];
                    allItems.push(...items);
                  });
                  setReceiptItems(allItems);
                  applyOwnerFromCache();
                  setSelectedOrder({
                    id: 'all-orders',
                    table_id: table.id,
                    status: 'all',
                    total_amount: getTotalAmount(),
                    payment_status: 'unpaid',
                    created_at: new Date().toISOString()
                  } as any);
                  setShowReceipt(true);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center min-h-[46px]"
              >
                <Printer className="w-5 h-5 mr-2" />
                Barcha Cheklar
              </button>
              <button
                onClick={handleAddMoreItems}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center min-h-[46px]"
              >
                <Plus className="w-5 h-5 mr-2" />
                Yangi Buyurtma
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && selectedOrder && (
        <CheckoutModal
          order={selectedOrder}
          orderItems={orderItems[selectedOrder.id] || []}
          tableNumber={table.number}
          onClose={() => {
            setShowCheckout(false);
            setSelectedOrder(null);
          }}
          onCheckout={handleCheckout}
        />
      )}

      {showAddOrder && (
        <OrderModal
          table={table}
          onClose={() => {
            setShowAddOrder(false);
            loadOrders();
            onRefresh();
          }}
        />
      )}

      {showReceipt && selectedOrder && (
        <ReceiptPrint
          order={selectedOrder}
          orderItems={(receiptItems ?? orderItems[selectedOrder.id]) || []}
          tableNumber={table.number}
          restaurantName={ownerInfo.name || 'Mening Restoranim'}
          restaurantPhone={ownerInfo.phone}
          restaurantAddress={ownerInfo.address}
          waiterName={profile?.name}
          ownerCard={ownerInfo.card}
          ownerQrUrl={ownerInfo.qr}
          onClose={() => {
            setShowReceipt(false);
            setSelectedOrder(null);
            setReceiptItems(null);
            // Now refresh state after printing/closing receipt
            loadOrders();
            onRefresh();
          }}
        />
      )}
    </>
  );
  } catch (error) {
    console.error('Error in TableOrderView:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Xatolik</h2>
          <p className="text-gray-600 mb-4">Stol ma'lumotlarini yuklashda xatolik yuz berdi.</p>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    );
  }
};
  
