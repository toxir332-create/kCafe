export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'waiter' | 'chef' | 'courier';
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  ingredients: string[];
  isAvailable: boolean;
  preparationTime: number; // in minutes
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied';
  currentOrder?: string;
}

export interface Order {
  id: string;
  tableId: string;
  waiterId: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'online';
  createdAt: Date;
  updatedAt: Date;
  specialInstructions?: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialRequests?: string;
  price: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  lastRestocked: Date;
  supplierId?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  schedule: WorkShift[];
  performance: StaffPerformance;
  salary: number;
  isActive: boolean;
}

export interface WorkShift {
  date: Date;
  startTime: string;
  endTime: string;
  hoursWorked?: number;
}

export interface StaffPerformance {
  ordersServed: number;
  customerRating: number;
  efficiency: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  orderHistory: string[];
  preferences: string[];
}

export interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  topItems: MenuItem[];
  orderCount: number;
  customerCount: number;
}