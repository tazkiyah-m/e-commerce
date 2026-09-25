'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnimeNavBar } from './ui/anime-navbar';
import { Home, Sparkles, Star, MapPin, ShoppingCart } from 'lucide-react';

const navItems = [
  { name: "Home", url: "/#home", icon: Home },
  { name: "Promo", url: "/#promo", icon: Sparkles },
  { name: "Best Seller", url: "/#story", icon: Star },
  { name: "Location", url: "/#location", icon: MapPin },
];

export default function Header() {
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Determine default active based on pathname
  const defaultActive = navItems.find(i => i.url === pathname)?.name || "Home";

  return (
    <>
      {/* Store Operational Concept Info Banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-950 via-amber-800 to-primary text-white text-[11px] font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-sm border-b border-amber-500/20 backdrop-blur-md">
        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">📍 Ops Toko</span>
        <span className="truncate">Pesan dari Rumah / Toko $\rightarrow$ <strong>Ambil Sendiri di Toko (Bebas Antre)</strong> | 🛵 <i>Pesan Antar bergiliran (1 Kurir)</i></span>
      </div>

      {/* Anime Navbar — center floating pill */}
      <AnimeNavBar items={navItems} defaultActive={defaultActive} />

      {/* Cart + Auth — floating top-right */}
      <div className="fixed top-8 right-6 z-[10000] flex items-center gap-3">
        {/* Cart */}
        <Link href="/checkout" className="relative group">
          <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors">
            <ShoppingCart size={16} className="text-white/80 group-hover:text-white transition-colors" />
          </div>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#0071e3] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </Link>
        
        {/* Auth */}
        {isAuthenticated && user ? (
          <div className="relative">
            <div 
              className="cursor-pointer"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <img 
                alt={user.full_name} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20 hover:ring-white/40 transition-all" 
                src={user.picture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name) + "&background=1d1d1f&color=fff&size=40"}
              />
            </div>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-52 bg-black/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.3)] py-1 border border-white/10">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-[13px] font-semibold text-white truncate">{user.full_name}</p>
                  <p className="text-[11px] text-white/50 truncate">{user.email}</p>
                </div>
                <Link 
                  href="/orders" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <span className="material-symbols-outlined text-[18px] text-white/50">dashboard</span>
                  <span className="text-[13px] text-white">Dashboard</span>
                </Link>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-white/50">logout</span>
                  <span className="text-[13px] text-red-400">Keluar</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link 
            href="/auth" 
            className="h-10 px-5 rounded-full bg-[#0071e3] text-white text-[12px] font-semibold flex items-center hover:bg-[#0077ed] transition-colors"
          >
            Masuk
          </Link>
        )}
      </div>
    </>
  );
}
