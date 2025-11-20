import React from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  lastRestocked: Date;
}

interface InventoryCardProps {
  item: InventoryItem;
  onUpdateStock: (itemId: string, newStock: number) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onUpdateStock }) => {
  const isLowStock = item.currentStock <= item.minStock;
  const stockPercentage = (item.currentStock / (item.minStock * 2)) * 100;

  const getStockColor = () => {
    if (isLowStock) return 'text-red-600';
    if (stockPercentage < 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockBarColor = () => {
    if (isLowStock) return 'bg-red-500';
    if (stockPercentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
      isLowStock ? 'border-red-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Package className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
            {isLowStock && <AlertTriangle className="w-5 h-5 text-red-500 ml-2" />}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Stock</span>
          <span className={`font-bold ${getStockColor()}`}>
            {item.currentStock} {item.unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Minimum Stock</span>
          <span className="text-sm text-gray-900">{item.minStock} {item.unit}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getStockBarColor()}`}
            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
          />
        </div>

        <div className="text-xs text-gray-500">
          Last restocked: {item.lastRestocked.toLocaleDateString()}
        </div>

        {isLowStock && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm font-medium">Low Stock Alert!</p>
            <p className="text-red-600 text-xs mt-1">
              Consider restocking soon to avoid shortages
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onUpdateStock(item.id, Math.max(0, item.currentStock - 5))}
          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded-lg text-sm transition-colors"
          disabled={item.currentStock <= 0}
        >
          <TrendingDown className="w-4 h-4 inline mr-1" />
          -5
        </button>
        <button
          onClick={() => onUpdateStock(item.id, item.currentStock + 10)}
          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 px-3 rounded-lg text-sm transition-colors"
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          +10
        </button>
      </div>
    </div>
  );
};

export const InventoryList: React.FC = () => {
  const { inventory, updateInventory } = useRestaurant();

  const handleUpdateStock = (itemId: string, newStock: number) => {
    if (newStock < 0) return;
    
    const currentItem = inventory.find(i => i.id === itemId);
    const updates: Partial<InventoryItem> = { 
      currentStock: newStock
    };
    
    // Update last restocked date if stock increased
    if (currentItem && newStock > currentItem.currentStock) {
      updates.lastRestocked = new Date();
    }
    
    updateInventory(itemId, updates);
  };

  const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
        {lowStockItems.length > 0 && (
          <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-2">
            <p className="text-red-800 text-sm font-medium">
              {lowStockItems.length} item(s) need restocking
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map(item => (
          <InventoryCard
            key={item.id}
            item={item}
            onUpdateStock={handleUpdateStock}
          />
        ))}
      </div>

      {inventory.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No inventory items found</p>
          <p className="text-gray-400 text-sm mt-2">
            Add inventory items to track your stock levels
          </p>
        </div>
      )}
    </div>
  );
};