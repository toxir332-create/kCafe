import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const isUUID = (v: string | null | undefined) =>
  !!(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v));

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  ingredients: string[];
  isAvailable: boolean;
  preparationTime: number;
}

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrder?: string;
  reservedBy?: string;
  reservationTime?: Date;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialRequests?: string;
}

interface Order {
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

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  lastRestocked: Date;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
}

interface RestaurantContextType {
  menuItems: MenuItem[];
  tables: Table[];
  orders: Order[];
  inventory: InventoryItem[];
  customers: Customer[];
  loading: boolean;
  error: string | null;
  updateTable: (tableId: string, updates: Partial<Table>) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => Promise<void>;
  updateInventory: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  refreshData: () => Promise<void>;
  createOrderForTable: (tableId: string, orderItems: OrderItem[], specialInstructions?: string) => Promise<void>;
  addTable: (table: { number: number; seats: number }) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  createDefaultTables50: () => Promise<void>;
  addMenuItem: (newItem: Omit<MenuItem, 'id'>) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);
// Local storage helpers for demo/offline fallback
const readFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : defaultValue;
  } catch {
    return defaultValue;
  }
};

const writeToLocalStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};


// Generate 50 demo tables (all available by default)
const generateDemoTables = (): Table[] => {
  const tables: Table[] = [];
  for (let i = 1; i <= 50; i++) {
    const seats = i <= 20 ? 2 : i <= 35 ? 4 : i <= 45 ? 6 : 8;
    tables.push({
      id: i.toString(),
      number: i,
      seats,
      status: 'available'
    });
  }
  return tables;
};

// Demo data
const demoMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Margarita Pitsa',
    description: 'Yangi pomidor, mozzarella pishloq, rayhon bilan tayyorlangan',
    price: 24.99,
    category: 'Pitsa',
    ingredients: ['pomidor', 'mozzarella', 'rayhon', 'xamir'],
    isAvailable: true,
    preparationTime: 15
  },
  {
    id: '2',
    name: 'Tovuqli Sezar Salati',
    description: 'Qovurilgan tovuq go\'shti, salat bargi, parmesan pishloq bilan',
    price: 18.99,
    category: 'Salatlar',
    ingredients: ['tovuq go\'shti', 'salat', 'parmesan', 'non bo\'laklari', 'sous'],
    isAvailable: true,
    preparationTime: 8
  },
  {
    id: '3',
    name: 'Mol Go\'shti Burger',
    description: 'Mol go\'shti, salat, pomidor, pishloq va kartoshka fri bilan',
    price: 22.99,
    category: 'Burgerlar',
    ingredients: ['mol go\'shti', 'salat', 'pomidor', 'pishloq', 'non', 'kartoshka fri'],
    isAvailable: true,
    preparationTime: 12
  },
  {
    id: '4',
    name: 'Tiramisu',
    description: 'Klassik italyan deserti qahva va maskarpone bilan',
    price: 8.99,
    category: 'Desertlar',
    ingredients: ['maskarpone', 'qahva', 'pechene', 'kakao'],
    isAvailable: true,
    preparationTime: 5
  },
  {
    id: '5',
    name: 'Pepperoni Pitsa',
    description: 'Klassik pepperoni mozzarella pishloq bilan',
    price: 27.99,
    category: 'Pitsa',
    ingredients: ['pepperoni', 'mozzarella', 'xamir', 'pomidor sousi'],
    isAvailable: true,
    preparationTime: 15
  },
  {
    id: '6',
    name: 'Yunon Salati',
    description: 'Yangi sabzavotlar feta pishloq va zaytun moyi bilan',
    price: 16.99,
    category: 'Salatlar',
    ingredients: ['pomidor', 'bodring', 'zaytun', 'feta pishloq', 'zaytun moyi'],
    isAvailable: true,
    preparationTime: 5
  },
  {
    id: '7',
    name: 'Baliq va Kartoshka',
    description: 'Pivo xamirida baliq, qarsildoq kartoshka va tartar sous bilan',
    price: 19.99,
    category: 'Asosiy Taomlar',
    ingredients: ['baliq', 'xamir', 'kartoshka', 'tartar sous'],
    isAvailable: true,
    preparationTime: 18
  },
  {
    id: '8',
    name: 'Karbonara Makaron',
    description: 'Qaymoqli makaron bekon, tuxum va parmesan bilan',
    price: 17.99,
    category: 'Makaron',
    ingredients: ['makaron', 'bekon', 'tuxum', 'parmesan', 'qaymoq'],
    isAvailable: true,
    preparationTime: 14
  }
];

// removed unused demoOrders

const demoInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Pomidor',
    currentStock: 50,
    minStock: 20,
    unit: 'kilogram',
    lastRestocked: new Date()
  },
  {
    id: '2',
    name: 'Mozzarella Pishloq',
    currentStock: 15,
    minStock: 10,
    unit: 'kilogram',
    lastRestocked: new Date()
  },
  {
    id: '3',
    name: 'Tovuq Go\'shti',
    currentStock: 8,
    minStock: 15,
    unit: 'kilogram',
    lastRestocked: new Date()
  },
  {
    id: '4',
    name: 'Mol Go\'shti',
    currentStock: 30,
    minStock: 20,
    unit: 'dona',
    lastRestocked: new Date()
  }
];

const demoCustomers: Customer[] = [
  {
    id: '1',
    name: 'Akmal Karimov',
    phone: '+1234567890',
    email: 'akmal.karimov@email.com',
    loyaltyPoints: 150
  },
  {
    id: '2',
    name: 'Dilnoza Rahimova',
    phone: '+998901234568',
    email: 'dilnoza.rahimova@email.com',
    loyaltyPoints: 89
  }
];

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const isMissingRelation = (err: any) => {
    const msg = (err && (err.message || err.toString?.())) || '';
    return err?.code === 'PGRST205' || msg.includes("Could not find the table");
  };

  useEffect(() => {
    if (profile?.id) {
      loadTables();
      loadMenuItems();
      loadInventory();
      loadCustomers();
    }
  }, [profile?.id]);

  // Removed global background branding effect

  const loadMenuItems = async () => {
    if (offline) {
      const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
      setMenuItems(cached.length ? cached : demoMenuItems);
      if (!cached.length) writeToLocalStorage('menu_items', demoMenuItems);
      return;
    }
    try {
      // Apply cached immediately for snappy UI
      try {
        const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
        if (cached.length > 0) setMenuItems(cached);
      } catch {}

      // If remote previously failed with missing relation, skip further network
      const menuRemoteAllowed = localStorage.getItem('menu_remote_allowed');
      if (menuRemoteAllowed === 'false') {
        const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
        setMenuItems(cached.length ? cached : demoMenuItems);
        if (!cached.length) writeToLocalStorage('menu_items', demoMenuItems);
        setOffline(true);
        setError('Menyu (offline rejim)');
        return;
      }
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const supaAny: any = supabase as any;

      const mapRows = (rows: any[]): MenuItem[] => (rows || []).map((mi: any) => ({
        id: mi.id,
        name: mi.name,
        description: mi.description ?? '',
        price: Number(mi.price) || 0,
        category: mi.category,
        image: mi.image ?? undefined,
        ingredients: Array.isArray(mi.ingredients) ? mi.ingredients : [],
        isAvailable: (mi.is_available ?? mi.available ?? true),
        preparationTime: (mi.preparation_time ?? mi.prep_time ?? 15)
      }));

      // 1) Try canonical 'menu_items'
      let q1: any = supaAny
        .from('menu_items' as any)
        .select('id, name, description, price, category, image, ingredients, is_available, preparation_time, restaurant_id' as any)
        .order('name', { ascending: true });
      if (restaurantId && isUUID(restaurantId)) q1 = q1.eq('restaurant_id', restaurantId);
      const { data: d1, error: e1 }: any = await q1;
      if (!e1) {
        if (d1 && d1.length > 0) {
          const mapped = mapRows(d1);
          setMenuItems(mapped);
          writeToLocalStorage('menu_items', mapped);
          return;
        }
      }

      // If relation missing, try alternates
      if (e1 && isMissingRelation(e1)) {
        try { localStorage.setItem('menu_remote_allowed', 'false'); } catch {}
        const alternates = ['menu', 'menus', 'dishes', 'items'];
        for (const alt of alternates) {
          let qa: any = supaAny.from(alt as any).select('*' as any).order('name', { ascending: true });
          if (restaurantId && isUUID(restaurantId)) qa = qa.eq('restaurant_id', restaurantId);
          const { data: da, error: ea }: any = await qa;
          if (!ea) {
            const mapped = mapRows(da || []);
            setMenuItems(mapped);
            writeToLocalStorage('menu_items', mapped);
            return;
          }
        }

        // No relation exists → fallback to cache/demo and enable offline mode
        const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
        if (cached.length > 0) {
          setMenuItems(cached);
        } else {
          setMenuItems(demoMenuItems);
          writeToLocalStorage('menu_items', demoMenuItems);
        }
        setOffline(true);
        setError('Menyu jadvallari topilmadi (offline rejim)');
        return;
      }

      // If we had canonical relation but zero rows, attempt global adopt of orphan items in the same table
      if (!e1) {
        const { data: globalData, error: globalErr }: any = await supaAny
          .from('menu_items' as any)
          .select('id, name, description, price, category, image, ingredients, is_available, preparation_time, restaurant_id' as any)
          .order('name', { ascending: true });
        if (!globalErr && globalData && globalData.length > 0) {
          if (restaurantId && isUUID(restaurantId)) {
            try {
              const orphanIds = (globalData as any[]).filter((mi: any) => !mi.restaurant_id).map((mi: any) => mi.id);
              if (orphanIds.length) {
                await (supaAny.from('menu_items' as any).update({ restaurant_id: restaurantId } as any).in('id', orphanIds as any));
              }
            } catch (adoptErr) {
              console.warn('Menu adopt warning:', adoptErr);
            }
          }
          const mapped = mapRows(globalData);
          setMenuItems(mapped);
          writeToLocalStorage('menu_items', mapped);
          return;
        }
      }

      // Final fallback: cache or demo
      const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
      if (cached.length > 0) {
        setMenuItems(cached);
      } else {
        setMenuItems(demoMenuItems);
        writeToLocalStorage('menu_items', demoMenuItems);
      }
      setError('Menyu topilmadi, lokal maʼlumotlar ishlatildi');
    } catch (err: any) {
      if (isMissingRelation(err)) {
        try { localStorage.setItem('menu_remote_allowed', 'false'); } catch {}
        console.warn('Menu relation missing, using offline cache/demo.');
        setOffline(true);
      } else {
        console.warn('Menu load fallback:', err?.message || err);
      }
      const cached = readFromLocalStorage<MenuItem[]>('menu_items', []);
      if (cached.length > 0) {
        setMenuItems(cached);
      } else {
        setMenuItems(demoMenuItems);
        writeToLocalStorage('menu_items', demoMenuItems);
      }
      setError('Menyu yuklashda xatolik');
    }
  };

  const loadTables = async () => {
    if (!profile?.id) return;
    if (offline) {
      const cached = readFromLocalStorage<Table[]>('tables', []);
      if (cached.length > 0) {
        setTables(cached);
      } else {
        const demo = generateDemoTables();
        setTables(demo);
        writeToLocalStorage('tables', demo);
      }
      return;
    }

    try {
      let query: any = (supabase as any).from('tables').select('*');
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id;
      if (restaurantId && isUUID(restaurantId)) {
        query = (query as any).eq('restaurant_id', restaurantId);
      }
      query = (query as any).order('number', { ascending: true });
      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Recompute status based on open orders: occupied if there are active orders
        const tableIds = data.map((t: any) => t.id);
        try {
          const { data: openOrdersRaw, error: openErr } = await supabase
            .from('orders')
            .select('id, table_id, status, payment_status')
            .in('table_id', tableIds)
            .eq('status', 'open');
          if (openErr) throw openErr;

          const openOrders = (openOrdersRaw as Array<{ id: string; table_id: string | null; status: string; payment_status: string }> | null) || [];
          const occupiedSet = new Set<string>(openOrders.filter(o => !!o.table_id).map(o => o.table_id as string));
          const orderMap = new Map<string, string>();
          openOrders.forEach(o => {
            if (o.table_id) {
              orderMap.set(o.table_id, o.id);
            }
          });

          const normalized = data.map((t: any) => ({
            ...t,
            status: occupiedSet.has(t.id) ? 'occupied' : 'available',
            currentOrder: orderMap.get(t.id) || undefined
          }));

          setTables(normalized as any);
          writeToLocalStorage('tables', normalized);
        } catch {
          // Fallback: keep current statuses from DB without forcing
          setTables(data as any);
          writeToLocalStorage('tables', data as any);
        }
      } else {
        // Do NOT auto-create demo tables in DB; fallback to cached or demo locally
        const cached = readFromLocalStorage<Table[]>('tables', []);
        if (cached.length > 0) {
          setTables(cached);
        } else {
          const demo = generateDemoTables();
          setTables(demo);
          writeToLocalStorage('tables', demo);
        }
      }
    } catch (err: any) {
      console.error('Error loading tables:', err);
      setError('Stollarni yuklashda xatolik');
      // Fallback to cached or local demo tables to avoid empty UI
      const cached = readFromLocalStorage<Table[]>('tables', []);
      if (cached.length > 0) {
        setTables(cached);
      } else {
        const demo = generateDemoTables();
        setTables(demo);
        writeToLocalStorage('tables', demo);
      }
      if (isMissingRelation(err)) setOffline(true);
    }
  };

  

  const loadInventory = async () => {
    if (offline) {
      const cached = readFromLocalStorage<InventoryItem[]>('inventory', []);
      setInventory(cached.length ? cached : demoInventory);
      if (!cached.length) writeToLocalStorage('inventory', demoInventory);
      return;
    }
    try {
      // Apply cached immediately to avoid empty UI and unnecessary flashes
      try {
        const cached = readFromLocalStorage<InventoryItem[]>('inventory', []);
        if (cached.length > 0) setInventory(cached);
      } catch {}

      // If remote previously failed, skip network calls
      const invRemoteAllowed = localStorage.getItem('inventory_remote_allowed');
      if (invRemoteAllowed === 'false') {
        const cached = readFromLocalStorage<InventoryItem[]>('inventory', []);
        setInventory(cached.length ? cached : demoInventory);
        if (!cached.length) writeToLocalStorage('inventory', demoInventory);
        setOffline(true);
        setError('Ombor (offline rejim)');
        return;
      }
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;

      const mapInventoryRows = (rows: any[]): InventoryItem[] => {
        return (rows || []).map((it: any) => ({
          id: it.id,
          name: it.name ?? it.item_name ?? 'Nomaʼlum',
          currentStock: Number(it.current_stock ?? it.stock ?? it.quantity ?? 0) || 0,
          minStock: Number(it.min_stock ?? it.min_quantity ?? 0) || 0,
          unit: it.unit ?? it.unit_name ?? '',
          lastRestocked: (it.last_restocked ?? it.updated_at ?? it.created_at) ? new Date(it.last_restocked ?? it.updated_at ?? it.created_at) : new Date()
        }));
      };

      const supaAny: any = supabase as any;

      // 1) Try canonical 'inventory' table
      let q1: any = supaAny.from('inventory' as any).select('*' as any).order('name', { ascending: true });
      if (restaurantId && isUUID(restaurantId)) q1 = q1.eq('restaurant_id', restaurantId);
      const { data: d1, error: e1 }: any = await q1;
      if (!e1) {
        const mapped = mapInventoryRows(d1 || []);
        setInventory(mapped);
        writeToLocalStorage('inventory', mapped);
        return;
      }

      // If the table is missing, try common alternates
      if (isMissingRelation(e1)) {
        try { localStorage.setItem('inventory_remote_allowed', 'false'); } catch {}
        // 2) Try 'inventory_items'
        let q2: any = supaAny.from('inventory_items' as any).select('*' as any).order('name', { ascending: true });
        if (restaurantId && isUUID(restaurantId)) q2 = q2.eq('restaurant_id', restaurantId);
        const { data: d2, error: e2 }: any = await q2;
        if (!e2) {
          const mapped = mapInventoryRows(d2 || []);
          setInventory(mapped);
          writeToLocalStorage('inventory', mapped);
          return;
        }

        // 3) Try 'stock' (some schemas use this name)
        if (isMissingRelation(e2)) {
          let q3: any = supaAny.from('stock' as any).select('*' as any).order('name', { ascending: true });
          if (restaurantId && isUUID(restaurantId)) q3 = q3.eq('restaurant_id', restaurantId);
          const { data: d3, error: e3 }: any = await q3;
          if (!e3) {
            const mapped = mapInventoryRows(d3 || []);
            setInventory(mapped);
            writeToLocalStorage('inventory', mapped);
            return;
          }
        }
      }

      // If we reached here, either relation exists but errored, or alternates also failed.
      // If the primary error was missing relation, gracefully fallback without throwing.
      if (isMissingRelation(e1)) {
        const cached = readFromLocalStorage<InventoryItem[]>('inventory', []);
        if (cached.length > 0) {
          setInventory(cached);
        } else {
          setInventory(demoInventory);
          writeToLocalStorage('inventory', demoInventory);
        }
        setOffline(true);
        setError('Ombor jadvallari topilmadi (offline rejim)');
        return;
      }
      // Otherwise, bubble up to catch
      throw e1;
    } catch (err: any) {
      if (isMissingRelation(err)) {
        try { localStorage.setItem('inventory_remote_allowed', 'false'); } catch {}
        console.warn('Inventory relation missing; using cache/demo.');
      } else {
        console.warn('Inventory load fallback:', err?.message || err);
      }
      const cached = readFromLocalStorage<InventoryItem[]>('inventory', []);
      if (cached.length > 0) {
        setInventory(cached);
      } else {
        setInventory(demoInventory);
        writeToLocalStorage('inventory', demoInventory);
      }
      setError('Omborni yuklashda xatolik');
    }
  };

  const loadCustomers = async () => {
    if (offline) {
      const cached = readFromLocalStorage<Customer[]>('customers', []);
      setCustomers(cached.length ? cached : demoCustomers);
      if (!cached.length) writeToLocalStorage('customers', demoCustomers);
      return;
    }
    try {
      // Apply cached immediately
      try {
        const cached = readFromLocalStorage<Customer[]>('customers', []);
        if (cached.length > 0) setCustomers(cached);
      } catch {}

      // Skip network if previously disabled
      const custRemoteAllowed = localStorage.getItem('customers_remote_allowed');
      if (custRemoteAllowed === 'false') {
        const cached = readFromLocalStorage<Customer[]>('customers', []);
        setCustomers(cached.length ? cached : demoCustomers);
        if (!cached.length) writeToLocalStorage('customers', demoCustomers);
        setOffline(true);
        setError('Mijozlar (offline rejim)');
        return;
      }
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const supaAny: any = supabase as any;

      const mapRows = (rows: any[]): Customer[] =>
        (rows || []).map((c: any) => ({
          id: c.id,
          name: c.name ?? c.full_name ?? 'Mijoz',
          phone: c.phone ?? c.phone_number ?? '',
          email: c.email ?? c.mail ?? undefined,
          loyaltyPoints: c.loyalty_points ?? c.points ?? 0
        }));

      // 1) Try canonical 'customers'
      let q1: any = supaAny.from('customers' as any).select('*' as any).order('updated_at', { ascending: false });
      if (restaurantId && isUUID(restaurantId)) q1 = q1.eq('restaurant_id', restaurantId);
      const { data: d1, error: e1 }: any = await q1;
      if (!e1) {
        const mapped = mapRows(d1 || []);
        setCustomers(mapped);
        writeToLocalStorage('customers', mapped);
        return;
      }

      // 2) Try alternates if relation missing
      if (isMissingRelation(e1)) {
        // 'clients'
        let q2: any = supaAny.from('clients' as any).select('*' as any).order('updated_at', { ascending: false });
        if (restaurantId && isUUID(restaurantId)) q2 = q2.eq('restaurant_id', restaurantId);
        const { data: d2, error: e2 }: any = await q2;
        if (!e2) {
          const mapped = mapRows(d2 || []);
          setCustomers(mapped);
          writeToLocalStorage('customers', mapped);
          return;
        }

        // 'guests'
        if (isMissingRelation(e2)) {
          let q3: any = supaAny.from('guests' as any).select('*' as any).order('updated_at', { ascending: false });
          if (restaurantId && isUUID(restaurantId)) q3 = q3.eq('restaurant_id', restaurantId);
          const { data: d3, error: e3 }: any = await q3;
          if (!e3) {
            const mapped = mapRows(d3 || []);
            setCustomers(mapped);
            writeToLocalStorage('customers', mapped);
            return;
          }
        }
      }

      // If missing, fallback to cache/demo without throwing.
      if (isMissingRelation(e1)) {
        try { localStorage.setItem('customers_remote_allowed', 'false'); } catch {}
        const cached = readFromLocalStorage<Customer[]>('customers', []);
        if (cached.length > 0) {
          setCustomers(cached);
        } else {
          setCustomers(demoCustomers);
          writeToLocalStorage('customers', demoCustomers);
        }
        setOffline(true);
        setError('Mijozlar jadvallari topilmadi (offline rejim)');
        return;
      }

      // For any other error, fallback quietly to cache/demo instead of throwing
      const cached = readFromLocalStorage<Customer[]>('customers', []);
      if (cached.length > 0) {
        setCustomers(cached);
      } else {
        setCustomers(demoCustomers);
        writeToLocalStorage('customers', demoCustomers);
      }
      setError('Mijozlarni yuklashda xatolik (fallback)');
      return;
    } catch (err: any) {
      if (isMissingRelation(err)) {
        try { localStorage.setItem('customers_remote_allowed', 'false'); } catch {}
        console.warn('Customers relation missing, using offline cache/demo.');
      } else {
        console.error('Error loading customers:', err);
      }
      const cached = readFromLocalStorage<Customer[]>('customers', []);
      if (cached.length > 0) {
        setCustomers(cached);
      } else {
        setCustomers(demoCustomers);
        writeToLocalStorage('customers', demoCustomers);
      }
      setError('Mijozlarni yuklashda xatolik');
      if (isMissingRelation(err)) setOffline(true);
    }
  };

  const refreshData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      if (offline) {
        await Promise.all([
          loadTables(),
          loadMenuItems(),
          loadInventory(),
          loadCustomers()
        ]);
      } else {
        await Promise.all([
          loadTables(),
          loadMenuItems(),
          loadInventory(),
          loadCustomers()
        ]);
      }
      setError(null);
    } catch (err) {
      setError('Ma\'lumotlarni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async (newItem: Omit<MenuItem, 'id'>) => {
    try {
      const rawRestaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const restaurantId = rawRestaurantId && isUUID(rawRestaurantId) ? rawRestaurantId : null;
      const payload: any = {
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category,
        image: newItem.image ?? null,
        ingredients: newItem.ingredients ?? [],
        is_available: newItem.isAvailable ?? true,
        preparation_time: newItem.preparationTime ?? 15,
        restaurant_id: restaurantId
      };
      const menuTable: any = (supabase as any).from('menu_items' as any);
      const { data, error }: any = await (menuTable.insert as any)(payload as any).select().single();
      if (error) throw error;

      const mapped: MenuItem = {
        id: data.id,
        name: data.name,
        description: data.description ?? '',
        price: Number(data.price) || 0,
        category: data.category,
        image: data.image ?? undefined,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        isAvailable: data.is_available ?? true,
        preparationTime: data.preparation_time ?? 15
      };
      setMenuItems(prev => [...prev, mapped]);
      setError(null);
    } catch (err) {
      console.error('Error adding menu item:', err);
      // Fallback to local storage
      const local: MenuItem = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category,
        image: newItem.image,
        ingredients: newItem.ingredients ?? [],
        isAvailable: newItem.isAvailable ?? true,
        preparationTime: newItem.preparationTime ?? 15
      };
      setMenuItems(prev => {
        const next = [...prev, local];
        writeToLocalStorage('menu_items', next);
        return next;
      });
      setError('Menyu qo\'shishda xatolik');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    try {
      const menuTable: any = (supabase as any).from('menu_items' as any);
      const { error }: any = await (menuTable.delete as any)().eq('id', itemId as any);
      if (error) throw error;
      setMenuItems(prev => {
        const next = prev.filter(item => item.id !== itemId);
        writeToLocalStorage('menu_items', next);
        return next;
      });
      setError(null);
    } catch (err) {
      console.error('Error deleting menu item:', err);
      // Fallback to local
      setMenuItems(prev => {
        const next = prev.filter(item => item.id !== itemId);
        writeToLocalStorage('menu_items', next);
        return next;
      });
      setError('Menyuni o\'chirishda xatolik');
    }
  };

  const updateTable = async (tableId: string, updates: Partial<Table>) => {
    try {
      const tablesTable: any = (supabase as any).from('tables' as any);
      const { error }: any = await (tablesTable.update as any)(updates as any).eq('id', tableId as any);

      if (error) throw error;

      setTables(prev => prev.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      ));
      setError(null);
    } catch (err) {
      console.error('Error updating table:', err);
      setError('Stolni yangilashda xatolik');
    }
  };

  const createOrderForTable = async (
    tableId: string,
    orderItems: OrderItem[],
    specialInstructions?: string
  ) => {
    try {
      console.log('createOrderForTable called with:', { tableId, orderItems, specialInstructions });
      
      if (!orderItems || orderItems.length === 0) {
        throw new Error('Order items cannot be empty');
      }

      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      console.log('Total amount calculated:', totalAmount);

      const ordersTable: any = (supabase as any).from('orders' as any);
      const restaurantId = (profile as any)?.restaurant_id || (profile as any)?.id || null;
      const { data: orderData, error: orderError }: any = await (ordersTable.insert as any)({
        table_id: tableId,
        waiter_id: profile?.id ?? null,
        restaurant_id: restaurantId,
        status: 'open',
        total_amount: totalAmount,
        payment_status: 'unpaid',
        special_instructions: specialInstructions,
        created_at: new Date().toISOString()
      } as any).select().single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }

      console.log('Order created in database:', orderData);

      const items = orderItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return {
          order_id: orderData.id,
          menu_item_id: item.menuItemId,
          menu_item_name: menuItem?.name || 'Unknown',
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          special_requests: item.specialRequests
        };
      });

      console.log('Order items to insert:', items);

      const itemsTable: any = (supabase as any).from('order_items' as any);
      const { error: itemsError }: any = await (itemsTable.insert as any)(items as any);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        throw itemsError;
      }

      console.log('Order items created successfully');

      await updateTable(tableId, {
        status: 'occupied',
        currentOrder: orderData.id
      });

      console.log('Table status updated to occupied');

      // After creating order, reload latest state
      await refreshData();
      console.log('Data refreshed successfully');

      setError(null);
    } catch (err) {
      console.error('Error creating order:', err);
      console.log('Falling back to local storage persistence');
      
      // Fallback to local storage persistence
      const orderId = Date.now().toString();
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      console.log('Creating local order with ID:', orderId, 'Total:', totalAmount);
      
      const localOrders = readFromLocalStorage<any[]>('orders', []);
      localOrders.unshift({
        id: orderId,
        table_id: tableId,
        waiter_id: profile?.id ?? null,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'unpaid',
        special_instructions: specialInstructions,
        created_at: new Date().toISOString()
      });
      writeToLocalStorage('orders', localOrders);

      const existingItems = readFromLocalStorage<any[]>('order_items', []);
      const newItems = orderItems.map(item => ({
        id: `${orderId}-${item.menuItemId}-${Math.random().toString(36).slice(2, 8)}`,
        order_id: orderId,
        menu_item_id: item.menuItemId,
        menu_item_name: (menuItems.find(mi => mi.id === item.menuItemId)?.name) || 'Unknown',
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        special_requests: item.specialRequests
      }));
      writeToLocalStorage('order_items', [...newItems, ...existingItems]);

      const localTables = readFromLocalStorage<Table[]>('tables', []);
      const updatedTables = localTables.map(t => t.id === tableId ? { ...t, status: 'occupied', currentOrder: orderId } : t);
      writeToLocalStorage('tables', updatedTables);
      setTables(updatedTables as any);

      console.log('Local storage fallback completed successfully');
      setError(null);
    }
  };

  const addTable = async (table: { number: number; seats: number }) => {
    try {
      const payload: any = {
        number: table.number,
        seats: table.seats,
        status: 'available'
      };
      // include restaurant_id if available in schema
      if (profile?.id) {
        (payload as any).restaurant_id = profile.id;
      }
      const tablesTable: any = (supabase as any).from('tables' as any);
      const { data, error }: any = await (tablesTable.insert as any)(payload as any).select().single();
      if (error) throw error;
      setTables(prev => {
        const next = [...prev, data as any];
        writeToLocalStorage('tables', next);
        return next;
      });
    } catch (err) {
      console.error('Error adding table:', err);
      // Fallback to local
      setTables(prev => {
        const t: any = {
          id: Date.now().toString(),
          number: table.number,
          seats: table.seats,
          status: 'available'
        };
        const next = [...prev, t];
        writeToLocalStorage('tables', next);
        return next;
      });
      setError('Stol qo\'shishda xatolik');
    }
  };

  const deleteTable = async (tableId: string) => {
    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);
      if (error) throw error;
      setTables(prev => {
        const next = prev.filter(t => t.id !== tableId);
        writeToLocalStorage('tables', next);
        return next;
      });
    } catch (err) {
      console.error('Error deleting table:', err);
      // Fallback to local
      setTables(prev => {
        const next = prev.filter(t => t.id !== tableId);
        writeToLocalStorage('tables', next);
        return next;
      });
      setError('Stolni o\'chirishda xatolik');
    }
  };

  const createDefaultTables50 = async () => {
    if (!profile?.id) {
      // Fallback: local state only
      setTables(generateDemoTables());
      return;
    }
    try {
      const demoTables = generateDemoTables().map(table => ({
        number: table.number,
        seats: table.seats,
        status: 'available',
        restaurant_id: profile.id
      }));
      const tablesTable: any = (supabase as any).from('tables' as any);
      const { data, error }: any = await (tablesTable.insert as any)(demoTables as any).select();
      if (error) throw error;
      if (data) setTables(data as any);
    } catch (err) {
      console.error('Error creating default tables:', err);
      setTables(generateDemoTables());
    }
  };

  const addOrder = async (orderData: Partial<Order>) => {
    try {
      const newOrder: Order = {
        id: Date.now().toString(),
        tableId: orderData.tableId || '',
        waiterId: profile?.id || '',
        items: orderData.items || [],
        status: 'pending',
        totalAmount: orderData.totalAmount || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...orderData
      };
      
      setOrders(prev => [newOrder, ...prev]);
      
      // Update table status
      if (orderData.tableId) {
        await updateTable(orderData.tableId, { 
          status: 'occupied', 
          currentOrder: newOrder.id 
        });
      }
      
      setError(null);
    } catch (err) {
      setError('Buyurtma qo\'shishda xatolik');
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, ...updates, updatedAt: new Date() } : order
      ));
      
      // If order is completed, free up the table
      if (updates.status === 'served') {
        const order = orders.find(o => o.id === orderId);
        if (order?.tableId) {
          await updateTable(order.tableId, { 
            status: 'available', 
            currentOrder: undefined 
          });
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Buyurtmani yangilashda xatolik');
    }
  };

  const updateMenuItem = async (itemId: string, updates: Partial<MenuItem>) => {
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.image !== undefined) payload.image = updates.image;
      if (updates.ingredients !== undefined) payload.ingredients = updates.ingredients;
      if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;
      if (updates.preparationTime !== undefined) payload.preparation_time = updates.preparationTime;

      if (Object.keys(payload).length > 0) {
        const menuTable: any = (supabase as any).from('menu_items' as any);
        const { error }: any = await (menuTable.update as any)(payload as any).eq('id', itemId as any);
        if (error) throw error;
      }

      setMenuItems(prev => {
        const next = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
        writeToLocalStorage('menu_items', next);
        return next;
      });
      setError(null);
    } catch (err) {
      // Fallback to local
      setMenuItems(prev => {
        const next = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
        writeToLocalStorage('menu_items', next);
        return next;
      });
      setError('Menyuni yangilashda xatolik');
    }
  };

  const updateInventory = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      setInventory(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
      setError(null);
    } catch (err) {
      setError('Omborni yangilashda xatolik');
    }
  };

  return (
    <RestaurantContext.Provider value={{
      menuItems,
      tables,
      orders,
      inventory,
      customers,
      loading,
      error,
      updateTable,
      addOrder,
      updateOrder,
      updateMenuItem,
      updateInventory,
      refreshData,
      createOrderForTable,
      addTable,
      deleteTable,
      createDefaultTables50,
      addMenuItem,
      deleteMenuItem
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};