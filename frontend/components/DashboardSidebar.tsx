'use client';
import { useCart } from '../context/CartContext';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DashboardSidebar() {
  const { items, removeFromCart, updateQuantity, subtotal, total, promoCode, promoDiscount, applyPromo, cartCount } = useCart();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    document.addEventListener('toggleMobileMenu', handleToggle);
    return () => document.removeEventListener('toggleMobileMenu', handleToggle);
  }, []);
  
  // Check if we are in the menu page by checking pathname or just fallback if it's the main dashboard page
  // The sidebar is mostly used in dashboard routes.
  const getLinkClass = (path: string) => {
    // A simple check to highlight the menu if we are in /menu
    const isMenu = pathname === path || (path === '/menu' && pathname === '/');
    return isMenu
      ? "flex items-center px-6 py-2.5 rounded-xl transition-all bg-primary text-on-primary shadow-lg"
      : "flex items-center px-6 py-2.5 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all";
  };

  const [inputPromo, setInputPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handleApplyPromo = async () => {
    if (!inputPromo.trim()) return;
    const res = await applyPromo(inputPromo);
    setPromoMessage(res.message);
  };


  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed left-0 top-0 h-full w-80 bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      
      {/* Scrollable Main Area (Logo, Nav, Cart Items) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-8 flex flex-col">
        <div className="px-8 mb-8 flex items-center gap-3 shrink-0">
          <img alt="Logo" className="h-8" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMlEZYdbrVUFEUqI9DyxudhMy5Zn3nB2EsSkyVaDzOpYu0Tl2mWro5wBjhP_ZiwHAhR6_N7MTwIL1ez9R8rPkD5IcW-z-l6Fyg-CaMKCJTTmWOoSkQitrZHKlJg6q2nyD6FOMC7W0fDz5B35WZANUKwLxaSckO2SC9FKe_q8rSb70oG_EWDAjv62cu-AgzrITLuJcTORhYanWMP9GyxIJq56GthkWGQjqcu3v3IUQEtmQtyCv9Skst"/>
          <span className="font-headline-sm text-headline-sm">GGS_WELL</span>
        </div>
        
        {/* Navigation Section */}
        <nav className="px-4 space-y-1 mb-8 shrink-0" data-active-classes="bg-primary text-on-primary shadow-lg">
          <Link href="/menu" className={getLinkClass('/menu')}>
          <span className="material-symbols-outlined mr-4">restaurant_menu</span>Daftar Menu
        </Link>
        
        <div className="pt-4 border-t border-outline-variant/30 mt-4 space-y-1">
            <Link href="/orders" className="flex items-center px-6 py-2.5 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined mr-4">receipt_long</span>Riwayat Pembelian
            </Link>
            <Link href="/" className="flex items-center px-6 py-2.5 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined mr-4">home</span>Kembali ke Home
            </Link>
          </div>
        </nav>

        {/* Cart Section Integrated in Sidebar */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-outline-variant/30 pb-4">
          <div className="px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">shopping_bag</span>
              <h3 className="font-bold text-label-md">Keranjang Saya</h3>
            </div>
            <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{cartCount} ITEM</span>
          </div>
          
          <div className="px-6 space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-on-surface-variant text-label-sm mt-8">Keranjang kosong</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                    <img className="w-full h-full object-cover" src={item.image_url} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-[12px] font-bold text-on-surface truncate">{item.name}</p>
                      <button onClick={() => removeFromCart(item.menu_item_id)} className="text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-2 bg-surface-container rounded-full px-2 py-0.5">
                        <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="text-[14px] text-on-surface-variant">-</button>
                        <span className="text-[11px] font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.menu_item_id, 1)} 
                          disabled={item.stock !== undefined && item.quantity >= item.stock}
                          className={`text-[14px] transition-colors ${(item.stock !== undefined && item.quantity >= item.stock) ? 'text-outline-variant/50 cursor-not-allowed' : 'text-on-surface-variant hover:text-primary'}`}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[12px] font-bold">Rp {(item.price / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Promo Code */}
            {items.length > 0 && (
              <div className="mt-4 border-t border-outline-variant/30 pt-4">
                {!showPromoInput && !promoCode ? (
                  <div onClick={() => setShowPromoInput(true)} className="p-3 bg-surface-container-low rounded-xl flex items-center gap-2 cursor-pointer hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-primary text-[18px]">confirmation_number</span>
                    <span className="text-[11px] font-bold text-on-surface flex-1">Promo code?</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        value={inputPromo} 
                        onChange={(e) => setInputPromo(e.target.value)} 
                        placeholder="Masukkan kode promo"
                        disabled={!!promoCode}
                        className="flex-1 bg-surface-container-low text-label-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {!promoCode && (
                        <button onClick={handleApplyPromo} className="bg-primary text-on-primary px-3 py-2 rounded-lg text-label-sm font-bold">Apply</button>
                      )}
                    </div>
                    {promoMessage && <p className="text-[10px] text-primary">{promoMessage}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer of Sidebar Cart */}
      <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between text-[12px]">
          <span className="text-on-surface-variant">Subtotal</span>
          <span>Rp {subtotal.toLocaleString('id-ID')}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-[12px] text-primary">
            <span>Diskon Promo</span>
            <span>-Rp {promoDiscount.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between text-[14px] font-bold my-2 pt-2 border-t border-outline-variant/30">
          <span className="text-on-surface">Total</span>
          <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
        </div>
        <Link href="/checkout" className={`w-full py-3.5 rounded-xl font-bold text-label-sm shadow-lg transition-all flex items-center justify-center gap-2 ${items.length > 0 ? 'bg-primary text-on-primary hover:bg-black/90' : 'bg-surface-container text-on-surface-variant opacity-50 pointer-events-none'}`}>
          Checkout <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </aside>
    </>
  );
}
