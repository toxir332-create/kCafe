import React, { useEffect } from 'react';
import {
  Home,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  LogOut,
  UtensilsCrossed,
  Calendar,
  CreditCard,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = {
  admin: [
    { id: 'dashboard', label: 'Boshqaruv Paneli', icon: Home },
    { id: 'orders', label: 'Buyurtmalar', icon: ShoppingCart },
    { id: 'tables', label: 'Stollar', icon: UtensilsCrossed },
    { id: 'menu', label: 'Menyu', icon: Package },
    { id: 'staff', label: 'Xodimlar', icon: Users },
    { id: 'expenses', label: 'Harajatlar', icon: CreditCard },
    { id: 'debtors', label: 'Qarzdorlar', icon: CreditCard },
    
    { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
    { id: 'payments', label: 'To\'lovlar', icon: CreditCard },
    
    { id: 'settings', label: 'Sozlamalar', icon: Settings }
  ],
  manager: [
    { id: 'dashboard', label: 'Boshqaruv Paneli', icon: Home },
    { id: 'orders', label: 'Buyurtmalar', icon: ShoppingCart },
    { id: 'tables', label: 'Stollar', icon: UtensilsCrossed },
    { id: 'menu', label: 'Menyu', icon: Package },
    { id: 'staff', label: 'Xodimlar', icon: Users },
    { id: 'expenses', label: 'Harajatlar', icon: CreditCard },
    { id: 'debtors', label: 'Qarzdorlar', icon: CreditCard },
    
    { id: 'reports', label: 'Hisobotlar', icon: BarChart3 }
  ],
  waiter: [
    { id: 'dashboard', label: 'Boshqaruv Paneli', icon: Home },
    { id: 'orders', label: 'Buyurtma Olish', icon: ShoppingCart },
    { id: 'tables', label: 'Stollar', icon: UtensilsCrossed },
    { id: 'menu', label: 'Menyu', icon: Package }
  ],
  chef: [
    { id: 'kitchen', label: 'Oshxona Ekrani', icon: UtensilsCrossed },
    { id: 'orders', label: 'Buyurtmalar', icon: ShoppingCart }
  ],
  courier: [
    { id: 'deliveries', label: 'Yetkazib Berish', icon: ShoppingCart },
    { id: 'schedule', label: 'Jadval', icon: Calendar }
  ]
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { profile, logout } = useAuth();

  if (!profile) return null;

  const userMenuItems = menuItems[profile.role] || menuItems.waiter;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Lock body scroll when sidebar is open on small screens
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
    return;
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restoran POS</h1>
          <p className="text-sm text-gray-600 mt-1 capitalize">
            {profile.role === 'admin' ? 'Administrator' :
             profile.role === 'manager' ? 'Menejer' :
             profile.role === 'waiter' ? 'Ofitsiant' :
             profile.role === 'chef' ? 'Oshpaz' :
             profile.role === 'courier' ? 'Kuryer' : profile.role} Paneli
          </p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 py-6">
        <nav className="space-y-2 px-4">
          {userMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-500">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Chiqish
        </button>
      </div>
    </div>
    </>
  );
};