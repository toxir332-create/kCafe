import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { Users, CheckCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import { OrderModal } from './OrderModal';
import { TableOrderView } from './TableOrderView';
import { useAuth } from '../../contexts/AuthContext';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied';
  currentOrder?: string;
}

interface TableCardProps {
  table: Table;
  onTableClick: (table: Table) => void;
  onTakeOrder: (table: Table) => void;
}

const TableCard: React.FC<TableCardProps> = ({ table, onTableClick, onTakeOrder }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'occupied':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      default:
        return 'border-gray-200 bg-white hover:bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'occupied':
        return <Users className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Bo\'sh';
      case 'occupied':
        return 'Band';
      default:
        return status;
    }
  };

  return (
    <div
      className={`border rounded-xl p-2 sm:p-4 cursor-pointer transition-all hover:shadow-lg ${getStatusColor(table.status)} min-w-0 h-full flex flex-col`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{table.number}-stol</h3>
        {getStatusIcon(table.status)}
      </div>
      
      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 flex-1">
        <div className="flex items-center text-xs sm:text-sm text-gray-600">
          <Users className="w-4 h-4 mr-1.5 sm:mr-2" />
          {table.seats} o'rin
        </div>
        
        <div className="text-xs sm:text-sm">
          <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
            table.status === 'available' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {getStatusText(table.status)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 w-full mt-auto">
        {table.status === 'available' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTakeOrder(table);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Buyurtma Olish</span>
            <span className="sm:hidden">Buyurtma</span>
          </button>
        )}
        
        {table.status === 'occupied' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTableClick(table);
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <span className="hidden sm:inline">Buyurtmani Ko'rish</span>
            <span className="sm:hidden">Ko'rish</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const TableGrid: React.FC = () => {
  const { tables, refreshData, addTable, createDefaultTables50 } = useRestaurant();
  const { profile } = useAuth();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [newSeats, setNewSeats] = useState<string>('4');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
      if (cached?.logo_url && typeof cached.logo_url === 'string') setLogoUrl(cached.logo_url);
    } catch {}
  }, []);

  const handleTableClick = (table: Table) => {
    if (table.status === 'occupied') {
      setSelectedTable(table);
      setShowTableView(true);
    }
  };

  const handleTakeOrder = (table: Table) => {
    setSelectedTable(table);
    setShowOrderModal(true);
  };

  const getStatusSummary = () => {
    const summary = tables.reduce((acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return summary;
  };

  const statusSummary = getStatusSummary();

  // Normalize for display but keep list intact; if list missing, don't hide anything
  const displayedTables = (tables && tables.length > 0)
    ? tables.map((t: any) => {
        const forceFreeNumbers = new Set([1, 36, 37, 38, 39, 40]);
        const isForcedFree = forceFreeNumbers.has(t.number);
        // Only force to 'available' if there's no current order, otherwise respect the actual status
        const shouldForceAvailable = isForcedFree && !t.currentOrder;
        return { ...t, status: shouldForceAvailable ? 'available' : t.status };
      })
    : tables;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-full object-cover border" />
          )}
          <h2 className="text-2xl font-bold text-gray-900">Stollarni Boshqarish</h2>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">
            Bo'sh: {statusSummary.available || 0}
          </span>
          <span className="text-red-600 font-medium">
            Band: {statusSummary.occupied || 0}
          </span>
        </div>
      </div>

      {profile?.role === 'admin' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={async () => { await createDefaultTables50(); await refreshData(); }}
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> 50 ta stol yaratish
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Stol #"
              value={newTableNum}
              onChange={(e) => setNewTableNum(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24"
            />
            <input
              type="number"
              placeholder="O'rin"
              value={newSeats}
              onChange={(e) => setNewSeats(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24"
            />
            <button
              onClick={async () => {
                const num = parseInt(newTableNum);
                const seats = parseInt(newSeats);
                if (!num || !seats) return;
                await addTable({ number: num, seats });
                setNewTableNum('');
                setNewSeats('4');
              }}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              Stol qo'shish
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-2 sm:gap-4">
        {displayedTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onTableClick={handleTableClick}
            onTakeOrder={handleTakeOrder}
          />
        ))}
      </div>

      {profile?.role === 'admin' && (
        <div className="text-xs text-gray-500">Stolni o'chirish uchun kartaga ustida ushlab turing.</div>
      )}

      {showOrderModal && selectedTable && (
        <OrderModal
          table={selectedTable}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedTable(null);
            // Add a small delay to ensure data is properly refreshed
            setTimeout(() => {
              refreshData();
            }, 100);
          }}
        />
      )}

      {showTableView && selectedTable && (
        <TableOrderView
          table={selectedTable}
          onClose={() => {
            setShowTableView(false);
            setSelectedTable(null);
          }}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
};