import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UtensilsCrossed } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(email, password);
    if (!success) {
      setError('Login yoki parol noto\'g\'ri.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-blue-600 rounded-full">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Restoran POS</h2>
          <p className="mt-2 text-gray-600">Hisobingizga kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Login (Admin, Boshliq yoki Afitsant ismi)
            </label>
            <input
              id="username"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masalan: Admin yoki Boshliq yoki Ali"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Parol
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Kirilmoqda...' : 'Tizimga kirish'}
          </button>
          <div className="mt-6 text-xs text-gray-500 text-center">
            <p><b>Admin</b>: Login <b>Admin</b>, Parol <b>Admin12345</b></p>
            <p><b>Boshliq</b>: Login <b>Boshliq</b>, Parol <b>Boss12345</b></p>
            <p><b>Afitsant</b>: Login — ismi, Parol — Admin bergan parol</p>
          </div>
        </form>
      </div>
    </div>
  );
};