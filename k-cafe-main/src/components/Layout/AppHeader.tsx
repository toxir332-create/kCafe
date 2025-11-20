import React, { useEffect, useState } from 'react';

export const AppHeader: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>('Mening Restoranim');

  useEffect(() => {
    const load = () => {
      try {
        const cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null');
        if (cached) {
          setLogoUrl(typeof cached.logo_url === 'string' ? cached.logo_url : undefined);
          if (cached.restaurant_name) setName(cached.restaurant_name);
        }
      } catch {}
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('settings-cache-updated', onUpdate as any);
    window.addEventListener('storage', onUpdate as any);
    return () => {
      window.removeEventListener('settings-cache-updated', onUpdate as any);
      window.removeEventListener('storage', onUpdate as any);
    };
  }, []);

  return (
    <div className="w-full sticky top-0 z-20">
      <div className="bg-white/70 backdrop-blur border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded-full object-cover shadow-sm border"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">
                  LOGO
                </div>
              )}
              <div className="mt-2 text-base sm:text-lg font-semibold text-gray-900 text-center">
                {name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
