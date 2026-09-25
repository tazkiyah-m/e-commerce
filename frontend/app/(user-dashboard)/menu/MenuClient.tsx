'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../../../context/CartContext';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8080/api';

export default function MenuClient() {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { addToCart, items } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search') || '';
  const filterParam = searchParams.get('filter') || '';
  
  const activeCategory = categoryParam ? parseInt(categoryParam) : null;

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch menu items
  useEffect(() => {
    let url = `${API_URL}/menu?`;
    if (activeCategory && !filterParam) {
      url += `category=${activeCategory}&`;
    }
    if (searchParam) {
      url += `search=${encodeURIComponent(searchParam)}&`;
    }
    if (filterParam) {
      url += `filter=${filterParam}&`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => setMenuItems(data || []))
      .catch(err => console.error(err));
  }, [activeCategory, searchParam, filterParam, refreshTrigger]);

  // WebSocket for Realtime Menu Update
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/api/ws');
    ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
          const data = JSON.parse(event.data);
          if (data.type === 'MENU_UPDATED') {
            setRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (e) {
        // Silently ignore non-JSON websocket frames
      }
    };
    return () => ws.close();
  }, []);

  // Fetch promos
  useEffect(() => {
    fetch(`${API_URL}/promos`)
      .then(res => res.json())
      .then(data => setPromos(data || []))
      .catch(err => console.error(err));
  }, []);

  // Handle Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    router.push(`/menu?${params.toString()}`);
  };

  const handleFilter = (filterName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filterParam === filterName) {
      params.delete('filter');
    } else {
      params.set('filter', filterName);
    }
    router.push(`/menu?${params.toString()}`);
  };

  const handleCategory = (categoryId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === null) {
      params.delete('category');
    } else {
      params.set('category', categoryId.toString());
    }
    router.push(`/menu?${params.toString()}`);
  };

  return (
    <div className="flex flex-col w-full relative px-margin-desktop py-gutter-desktop">
      {/* Search & Filters */}
      <div className="flex flex-col gap-6 mb-12">
        <form onSubmit={handleSearch} className="relative group max-w-2xl">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-surface-container-low py-5 pl-16 pr-8 rounded-full text-body-md focus:outline-none focus:bg-surface-container-high transition-all shadow-sm focus:shadow-md" 
            placeholder="Cari makanan atau restoran favoritmu..." 
            type="text"
          />
        </form>
        <div className="flex flex-col gap-4">
          {/* Categories */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => handleCategory(null)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${activeCategory === null ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">apps</span> Semua
            </button>
            <button 
              onClick={() => handleCategory(2)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${activeCategory === 2 ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">restaurant</span> Main Course
            </button>
            <button 
              onClick={() => handleCategory(3)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${activeCategory === 3 ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">local_bar</span> Drinks
            </button>
            <button 
              onClick={() => handleCategory(4)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${activeCategory === 4 ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">fastfood</span> Fast Food
            </button>
            <button 
              onClick={() => handleCategory(5)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${activeCategory === 5 ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">cookie</span> Snacks
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => handleFilter('promo')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${filterParam === 'promo' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">percent</span> Promo
            </button>
            <button 
              onClick={() => handleFilter('terlaris')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-label-md transition-transform active:scale-95 whitespace-nowrap ${filterParam === 'terlaris' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">trending_up</span> Terlaris
            </button>
          </div>
        </div>
      </div>

      {/* Promo Carousel */}
      {activeCategory === 1 && promos.length > 0 && (
        <section className="mb-16 relative">
          <div className="flex items-end justify-between mb-6">
            <div className="flex flex-col gap-1">
              <span className="text-label-sm font-bold text-primary tracking-widest uppercase">Special Offers</span>
              <h2 className="font-display-lg text-display-lg">Promo Spesial Hari Ini</h2>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors" onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="p-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors" onClick={() => setCarouselIndex((prev) => Math.min(promos.length - 1, prev + 1))}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl group">
            <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
              {promos.map((promo, idx) => (
                <div key={promo.id} className="min-w-full relative h-[380px] shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10"></div>
                  {promo.image_url ? (
                    <img className="w-full h-full object-cover" src={promo.image_url} alt={promo.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary via-secondary to-tertiary" />
                  )}
                  <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 text-on-primary max-w-lg">
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded text-label-sm w-fit mb-4 uppercase tracking-wider font-bold">Offer</span>
                    <h3 className="text-4xl font-bold mb-4">{promo.title}</h3>
                    <p className="text-body-lg text-on-primary/80 mb-8">{promo.description}</p>
                    <button className="bg-on-primary text-primary px-8 py-3 rounded-full font-bold text-label-md w-fit hover:scale-105 transition-transform">Ambil Promo</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Product Grid */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-md text-headline-md">{filterParam || searchParam ? 'Hasil Pencarian' : 'Rekomendasi Untukmu'}</h3>
          <button className="text-label-md font-bold text-primary border-b-2 border-primary pb-1">Lihat Semua</button>
        </div>
        
        {menuItems.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">Belum ada menu yang sesuai.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter-desktop">
          {menuItems.map((item) => {
            const hasDiscount = item.discount_percent && item.discount_percent > 0;
            const finalPrice = hasDiscount ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;

            return (
              <div key={item.id} className={`group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 translate-y-0 hover:-translate-y-2 ${(!item.is_available || item.stock <= 0) ? 'opacity-50 grayscale' : ''}`}>
                <div className="relative h-48 overflow-hidden">
                  <img className={`w-full h-full object-cover transition-transform duration-700 ${(item.is_available && item.stock > 0) ? 'group-hover:scale-110' : ''}`} src={item.image_url} alt={item.name}/>
                  
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-md uppercase tracking-wide flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">percent</span> PROMO {item.discount_percent}%
                    </div>
                  )}

                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-yellow-500 text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    <span className="text-label-sm font-bold text-on-surface">{item.rating}</span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-[10px] font-bold">Stok: {item.stock}</div>
                  {(!item.is_available || item.stock <= 0) && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-error text-on-error px-4 py-2 rounded-full font-bold text-label-md uppercase tracking-widest shadow-lg">Habis</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="font-bold text-[16px] truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 text-on-surface-variant text-[11px] mt-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        <span>{item.prep_time}</span>
                      </div>
                    </div>
                    <button 
                      disabled={
                        !item.is_available || 
                        item.stock <= 0 || 
                        (items.find(i => i.menu_item_id === item.id)?.quantity || 0) >= item.stock
                      }
                      onClick={() => addToCart({
                        menu_item_id: item.id,
                        name: item.name,
                        price: finalPrice,
                        image_url: item.image_url
                      })}
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all ${
                        (item.is_available && item.stock > 0 && (items.find(i => i.menu_item_id === item.id)?.quantity || 0) < item.stock) 
                          ? 'bg-primary text-on-primary hover:scale-110 active:scale-90' 
                          : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                  
                  {hasDiscount ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[16px] text-red-600">Rp {finalPrice.toLocaleString('id-ID')}</span>
                      <span className="text-[12px] text-on-surface-variant line-through">Rp {item.price.toLocaleString('id-ID')}</span>
                    </div>
                  ) : (
                    <p className="font-bold text-[16px] text-primary">Rp {item.price.toLocaleString('id-ID')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Decoration */}
      <div className="fixed top-0 right-0 -z-10 opacity-20 pointer-events-none translate-x-1/2 -translate-y-1/2">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl"></div>
      </div>
    </div>
  );
}
