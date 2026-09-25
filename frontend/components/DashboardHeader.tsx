'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function DashboardHeader() {
  const [searchInput, setSearchInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { deliveryAddress, setDeliveryAddress } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/menu?search=${encodeURIComponent(searchInput)}`);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data && data.display_name) {
            setDeliveryAddress(data.display_name);
          } else {
            alert("Tidak dapat menemukan alamat untuk lokasi ini.");
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          alert("Terjadi kesalahan saat mengambil alamat.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Gagal mendapatkan lokasi. Pastikan izin akses lokasi di browser aktif.");
        setIsLocating(false);
      }
    );
  };

  return (
    <header className="fixed top-0 left-0 md:left-80 right-0 h-20 bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-30 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => document.dispatchEvent(new Event('toggleMobileMenu'))}
          className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container rounded-full"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

      </div>
      
      <div className="flex items-center gap-6">
        <form onSubmit={handleSearch} className="relative px-3 py-2 border border-outline-variant rounded-full flex items-center gap-2 hover:border-primary transition-all">
          <button type="submit" className="flex items-center text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[20px]">search</span></button>
          <input 
            type="text" 
            placeholder="Cari Menu..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-transparent border-none outline-none text-label-md text-on-surface w-32 focus:w-48 transition-all"
          />
        </form>
        
        {user ? (
          <div 
            className="flex items-center gap-3 pl-4 border-l border-outline-variant cursor-pointer group relative"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="text-right hidden sm:block">
              <p className="text-label-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                {user.full_name}
              </p>
              <p className="text-[10px] text-on-surface-variant">Member</p>
            </div>
            {user.picture ? (
              <img src={user.picture} alt={user.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-transparent group-hover:ring-primary transition-all" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shadow-sm">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-4 w-48 bg-white rounded-xl shadow-lg py-2 border border-outline-variant animate-in slide-in-from-top-2 z-50">
                <div className="px-4 py-2 border-b border-outline-variant">
                  <p className="text-label-md font-bold truncate">{user.full_name}</p>
                  <p className="text-label-sm text-on-surface-variant truncate">{user.email}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(false);
                    router.push('/');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">home</span>
                  <span className="text-label-md">Ke Halaman Utama</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(false);
                    if(logout) logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-error"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="text-label-md">Keluar</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => router.push('/auth')}
            className="h-10 px-5 rounded-full bg-primary text-on-primary text-label-md font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Masuk
          </button>
        )}
      </div>
    </header>
  );
}
