import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'waiter' | 'chef' | 'courier';
  avatar?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readLS = <T,>(key: string, def: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const username = (email || '').trim();
      const pwd = (password || '').trim();

      if (username === 'Admin' && pwd === 'Admin12345') {
        const u: User = { id: 'admin', name: 'Admin', email: 'Admin', role: 'admin', isActive: true };
        setUser(u);
        localStorage.setItem('currentUser', JSON.stringify(u));
        return true;
      }
      if (username === 'Boshliq' && pwd === 'Boss12345') {
        const u: User = { id: 'manager', name: 'Boshliq', email: 'Boshliq', role: 'manager', isActive: true };
        setUser(u);
        localStorage.setItem('currentUser', JSON.stringify(u));
        return true;
      }

      try {
        const { data: staff, error } = await supabase
          .from('staff' as any)
          .select('id, name, login, role, is_active')
          .or(`login.eq.${username},name.eq.${username}`)
          .maybeSingle() as any;
        if (error) throw error;
        if (!staff) return false;
        const { data: pwdCheck } = await supabase
          .from('staff' as any)
          .select('id')
          .eq('id', (staff as any).id)
          .eq('password', pwd)
          .maybeSingle() as any;
        if (!pwdCheck || (staff as any).is_active === false) return false;
        const u: User = { id: (staff as any).id, name: (staff as any).name, email: (staff as any).login, role: (staff as any).role === 'manager' ? 'manager' : 'waiter', isActive: true };
        setUser(u);
        localStorage.setItem('currentUser', JSON.stringify(u));
        return true;
      } catch {
        const staffLS = readLS<any[]>('staff', []);
        const un = username.toLowerCase();
        const found = staffLS.find(s => ((s.login?.toString().toLowerCase?.() === un) || (s.name?.toString().toLowerCase?.() === un)) && s.password === pwd && (s.is_active ?? true));
        if (!found) return false;
        const u: User = { id: found.id, name: found.name, email: found.login, role: found.role === 'manager' ? 'manager' : 'waiter', isActive: true };
        setUser(u);
        localStorage.setItem('currentUser', JSON.stringify(u));
        return true;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: user, 
      login, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};