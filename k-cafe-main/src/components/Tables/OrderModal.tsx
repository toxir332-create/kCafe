import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied';
}

interface OrderModalProps {
  table: Table;
  onClose: () => void;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
}

export const OrderModal: React.FC<OrderModalProps> = ({ table, onClose }) => {
  const { menuItems, createOrderForTable } = useRestaurant();
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initialize cart from localStorage if available
    try {
      const saved = localStorage.getItem(`cart_${table.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(false);

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];
  const filteredItems = menuItems.filter(item => 
    item.isAvailable && (selectedCategory === 'All' || item.category === selectedCategory)
  );

  const addToCart = (menuItem: any) => {
    setCart(prev => {
      const priceNum = Number(menuItem.price ?? menuItem.unit_price ?? 0);
      const existingItem = prev.find(item => item.menuItemId === menuItem.id);
      let newCart;
      if (existingItem) {
        newCart = prev.map(item =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newCart = [...prev, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: priceNum,
          quantity: 1
        }];
      }
      // Save to localStorage
      localStorage.setItem(`cart_${table.id}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menuItemId === menuItemId);
      let newCart;
      if (existingItem && existingItem.quantity > 1) {
        newCart = prev.map(item =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        newCart = prev.filter(item => item.menuItemId !== menuItemId);
      }
      // Save to localStorage
      localStorage.setItem(`cart_${table.id}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  const getCartItemQuantity = (menuItemId: string) => {
    const item = cart.find(item => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const getTotalAmount = () => {
    const total = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    return Number.isFinite(total) ? total : 0;
  };

  const getTotalQuantity = () => {
    const qty = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return Number.isFinite(qty) ? qty : 0;
  };

  useEffect(() => {
    try { localStorage.setItem(`cart_${table.id}`, JSON.stringify(cart)); } catch {}
  }, [cart, table.id]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Buyurtmada mahsulot yo\'q!');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating order for table:', table.id);
      console.log('Cart items:', cart);
      
      const orderItems = cart.map(item => ({
        id: Date.now().toString() + Math.random().toString(),
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: Number(item.price),
        specialRequests: item.specialRequests
      }));

      console.log('Order items to create:', orderItems);
      localStorage.setItem(`cart_${table.id}`, JSON.stringify(cart));
      await createOrderForTable(table.id, orderItems, specialInstructions);
      console.log('Order created successfully');
      
      // Clear the cart from localStorage
      localStorage.removeItem(`cart_${table.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Buyurtma yaratishda xatolik: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            {table.number}-stol uchun buyurtma
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Menu Items */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {/* Category Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <p className="text-lg font-bold text-blue-600">{item.price.toLocaleString()} so'm</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {getCartItemQuantity(item.id) > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {getCartItemQuantity(item.id)}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Buyurtmaga Qo'shish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-80 bg-gray-50 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[40vh] lg:max-h-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyurtma Xulasasi</h3>
            
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Buyurtmada mahsulot yo'q</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="bg-white rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <button
                          onClick={() => removeFromCart(item.menuItemId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {item.quantity} × {item.price.toLocaleString()} so'm
                        </span>
                        <span className="font-semibold">
                          {(item.quantity * item.price).toLocaleString()} so'm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maxsus Ko'rsatmalar
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Maxsus talablar..."
              />
            </div>

            {/* Total and Submit */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Jami:</span>
                <span className="text-xl font-bold text-blue-600">
                  {Number(getTotalAmount()).toLocaleString()} so'm
                </span>
              </div>
              
              <button
                onClick={handleSubmitOrder}
                disabled={getTotalQuantity() === 0 || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  'Buyurtma Yaratilmoqda...'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buyurtma Yaratish ({getTotalQuantity()} ta mahsulot)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};