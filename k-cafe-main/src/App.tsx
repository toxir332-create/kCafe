import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RestaurantProvider } from './contexts/RestaurantContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { AppHeader } from './components/Layout/AppHeader';
import { DashboardStats } from './components/Dashboard/DashboardStats';
import { TableGrid } from './components/Tables/TableGrid';
import { OrderList } from './components/Orders/OrderList';
import { MenuManagement } from './components/Menu/MenuManagement';
import { ReportsDashboard } from './components/Reports/ReportsDashboard';
import { DishStats } from './components/Reports/DishStats';
import { PaymentsHistory } from './components/Payments/PaymentsHistory';
import { SettingsPage } from './components/Settings/SettingsPage';
import { Menu } from 'lucide-react';
import { StaffManagement } from './components/Staff/StaffManagement';
import { ExpensesPage } from './components/Expenses/ExpensesPage';
import { DebtorsPage } from './components/Debtors/DebtorsPage';

const MainApp: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist currently active tab to survive auto reload/HMR
  useEffect(() => {
    try {
      localStorage.setItem('active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  if (!profile) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Xush kelibsiz, {profile.name}!
              </h1>
              <p className="text-gray-600">
                Bugun restoraningizda sodir bo'layotgan voqealar.
              </p>
            </div>
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">So'nggi Buyurtmalar</h3>
                <p className="text-gray-500">Ko'rsatish uchun so'nggi buyurtmalar yo'q</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tezkor Amallar</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Yangi Buyurtma Olish
                  </button>
                  <button
                    onClick={() => setActiveTab('tables')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Stollarni Ko'rish
                  </button>
                  
                </div>
              </div>
            </div>
          </div>
        );
      case 'orders':
      case 'kitchen':
        return <OrderList />;
      case 'tables':
        return <TableGrid />;
      case 'menu':
        return <MenuManagement />;
      
      case 'reports':
        return (
          <div className="space-y-6">
            <ReportsDashboard />
            <DishStats />
          </div>
        );
      case 'staff':
        return <StaffManagement />;
      case 'expenses':
        return <ExpensesPage />;
      case 'payments':
        return <PaymentsHistory />;
      case 'debtors':
        return <DebtorsPage />;
      
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sahifa Topilmadi</h2>
            <p className="text-gray-600">So'ralgan sahifa topilmadi.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-auto">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Restoran POS</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <AppHeader />
        <div className="p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <MainApp />
      </RestaurantProvider>
    </AuthProvider>
  );
}

export default App;