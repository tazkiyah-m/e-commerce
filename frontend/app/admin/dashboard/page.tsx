'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminChatTab from '@/components/AdminChatTab';
import AdminStoreTab from '@/components/AdminStoreTab';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartItem {
  name: string;
  omset: number;
  profit: number;
}

interface Analytics {
  total_omset: number;
  total_hpp: number;
  profit: number;
  recent_orders: number;
  chart_data: ChartItem[];
}

interface AdminOrder {
  id: number;
  order_id_string: string;
  user_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface AdminMenu {
  id: number;
  name: string;
  description: string;
  price: number;
  hpp: number;
  image_url: string;
  category_id: number;
  is_available: boolean;
  stock: number;
  discount_percent?: number;
}

interface AdminPromo {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_usage: number;
  title: string;
  description: string;
  is_active: boolean;
  expires_at: string;
}

interface AdminBanner {
  id: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'promo' | 'pos' | 'live_chat' | 'store_location'>('dashboard');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [dashboardRange, setDashboardRange] = useState<'7d' | '1m' | '1y' | 'date' | 'custom'>('7d');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashboardStartDate, setDashboardStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dashboardEndDate, setDashboardEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  interface POSItem {
    menu_item_id: number;
    name: string;
    price: number;
    quantity: number;
  }
  const [posCart, setPosCart] = useState<POSItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');
  const [isSubmittingPOS, setIsSubmittingPOS] = useState(false);
  
  const [analytics, setAnalytics] = useState<Analytics>({
    total_omset: 0, total_hpp: 0, profit: 0, recent_orders: 0, chart_data: []
  });
  const [analyticsMessage, setAnalyticsMessage] = useState<string>("");
  
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Partial<AdminMenu> | null>(null);
  
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<AdminPromo> | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

  const fetchData = async () => {
    try {
      const ts = Date.now();
      const [resAnalytic, resOrder, resMenu, resPromo, resBanner] = await Promise.all([
        fetch(`http://localhost:8080/api/admin/finance?range=${dashboardRange}&date=${dashboardDate}&start_date=${dashboardStartDate}&end_date=${dashboardEndDate}&t=${ts}`),
        fetch(`http://localhost:8080/api/admin/orders?t=${ts}`),
        fetch(`http://localhost:8080/api/admin/menu?t=${ts}`),
        fetch(`http://localhost:8080/api/admin/promos?t=${ts}`),
        fetch(`http://localhost:8080/api/banners?t=${ts}`)
      ]);
      if (resAnalytic.ok) {
        const data = await resAnalytic.json();
        if (data.message) {
          setAnalyticsMessage(data.message);
        } else {
          setAnalyticsMessage("");
          setAnalytics(data);
        }
      }
      if (resOrder.ok) setOrders(await resOrder.json());
      if (resMenu.ok) setMenus(await resMenu.json());
      if (resPromo.ok) setPromos(await resPromo.json());
      if (resBanner.ok) setBanners(await resBanner.json());
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  };

  const handlePOSAddToCart = (menu: AdminMenu) => {
    if (!menu.is_available || menu.stock <= 0) return;
    setPosCart(prev => {
      const existing = prev.find(p => p.menu_item_id === menu.id);
      if (existing) {
        return prev.map(p => p.menu_item_id === menu.id ? { ...p, quantity: Math.min(menu.stock, p.quantity + 1) } : p);
      }
      return [...prev, { menu_item_id: menu.id, name: menu.name, price: menu.price, quantity: 1, stock: menu.stock }];
    });
  };

  const handlePOSUpdateQuantity = (id: number, delta: number) => {
    setPosCart(prev => prev.map(p => {
      if (p.menu_item_id === id) {
        const stockLimit = (p as any).stock || 999;
        return { ...p, quantity: Math.min(stockLimit, Math.max(0, p.quantity + delta)) };
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePOSSubmit = async () => {
    if (posCart.length === 0) return;
    setIsSubmittingPOS(true);
    try {
      const res = await fetch('http://localhost:8080/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: posTotal,
          customer_name: posCustomerName,
          payment_method: posPaymentMethod,
          items: posCart.map(p => ({
            menu_item_id: p.menu_item_id,
            quantity: p.quantity,
            price: p.price
          }))
        })
      });
      if (res.ok) {
        setPosCart([]);
        setPosCustomerName('');
        setPosPaymentMethod('Cash');
      } else {
        alert("Gagal menyimpan pesanan.");
      }
    } catch (e) {
      alert("Kesalahan koneksi.");
    } finally {
      setIsSubmittingPOS(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
      
      const ws = new WebSocket('ws://localhost:8080/api/ws');
      ws.onopen = () => console.log('WebSocket connected');
      ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_ORDER') {
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.log("Audio play blocked", e));
              }
              setNotifications(prev => [data.message + ' (Order #' + data.order_id + ')', ...prev].slice(0, 5));
              setUnreadCount(prev => prev + 1);
              fetchData(); // reload all data silently
            } else if (data.type === 'MENU_UPDATED') {
              fetchData();
            } else if (data.type === 'CHAT_MESSAGE') {
              if (data.chat_message?.sender_role === 'user') {
                if (audioRef.current) {
                  audioRef.current.play().catch(e => console.log("Audio play blocked", e));
                }
                setNotifications(prev => [`💬 Chat Baru dari ${data.chat_message.user_name || 'Pelanggan'}: "${data.chat_message.message}"`, ...prev].slice(0, 5));
                setUnreadCount(prev => prev + 1);
                setUnreadChatCount(prev => prev + 1);
              }
            }
          }
        } catch (e) {
          // Silently ignore non-JSON websocket frames
        }
      };
      return () => ws.close();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchData();
  }, [dashboardRange, dashboardDate, dashboardStartDate, dashboardEndDate]);

  if (!isAuthenticated || user?.role !== 'admin') return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID');
  };

  const handleMenuToggle = async (id: number, current: boolean) => {
    try {
      await fetch('http://localhost:8080/api/admin/menu/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_available: !current })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handlePromoToggle = async (id: number, current: boolean) => {
    try {
      await fetch('http://localhost:8080/api/admin/promos/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm('Yakin ingin menghapus menu ini?')) return;
    try {
      await fetch(`http://localhost:8080/api/admin/menu?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSaveMenu = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingMenu?.id,
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      hpp: Number(formData.get('hpp')),
      stock: Number(formData.get('stock')),
      discount_percent: Number(formData.get('discount_percent')) || 0,
      category_id: Number(formData.get('category_id')),
      image_url: formData.get('image_url') || '/images/nasi_goreng.png'
    };
    
    try {
      await fetch('http://localhost:8080/api/admin/menu', {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setShowMenuModal(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm('Yakin ingin menghapus promo ini?')) return;
    try {
      await fetch(`http://localhost:8080/api/admin/promos?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSavePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingPromo?.id,
      code: formData.get('code'),
      title: formData.get('title'),
      description: formData.get('description'),
      discount_type: formData.get('discount_type'),
      discount_value: Number(formData.get('discount_value')),
      min_purchase: Number(formData.get('min_purchase')),
      max_usage: Number(formData.get('max_usage')),
      expires_at: formData.get('expires_at') ? new Date(formData.get('expires_at') as string).toISOString() : new Date().toISOString()
    };

    try {
      await fetch('http://localhost:8080/api/admin/promos', {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setShowPromoModal(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('banner', file);

    try {
      const res = await fetch('http://localhost:8080/api/admin/banner/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert('Banner berhasil diunggah!');
        fetchData();
      } else {
        alert('Gagal mengunggah banner.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    }
  };

  const handleBannerToggle = async (id: number, current: boolean) => {
    try {
      await fetch('http://localhost:8080/api/admin/banners/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!confirm('Yakin ingin menghapus banner ini?')) return;
    try {
      await fetch(`http://localhost:8080/api/admin/banners?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative w-64 h-full bg-surface-container-low border-r border-outline-variant/30 flex flex-col shrink-0 z-50 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h1 className="font-headline-sm text-primary font-bold">GGS Admin</h1>
            <p className="text-label-sm text-on-surface-variant mt-1">Management Console</p>
          </div>
          <button className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'menu' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">restaurant_menu</span> Manajemen Menu
          </button>
          <button 
            onClick={() => setActiveTab('promo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'promo' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">campaign</span> Promo & Banner
          </button>
          <button 
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'pos' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">point_of_sale</span> Kasir (POS)
          </button>
          <button 
            onClick={() => { setActiveTab('live_chat'); setUnreadChatCount(0); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'live_chat' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">forum</span> Live Chat Resto
            </div>
            {unreadChatCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('store_location')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'store_location' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">storefront</span> Lokasi & Ongkir Toko
          </button>
        </nav>
        <div className="p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">A</div>
            <div>
              <p className="font-bold text-label-sm">{user.full_name || 'Admin'}</p>
            </div>
          </div>
          <button 
            onClick={() => { logout(); router.push('/admin/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/50 rounded-xl transition-colors font-bold"
          >
            <span className="material-symbols-outlined">logout</span> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container rounded-full"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="font-headline-sm m-0 capitalize truncate max-w-[200px] sm:max-w-none">{activeTab.replace('_', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="relative group cursor-pointer" onClick={() => setUnreadCount(0)}>
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant hover:text-primary transition-colors">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-error text-on-error rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
              {notifications.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-outline-variant/30 p-2 hidden group-hover:block z-50">
                  <p className="px-3 py-2 text-label-sm font-bold border-b border-outline-variant/30 mb-2">Notifikasi Terbaru</p>
                  {notifications.map((notif, idx) => (
                    <div key={idx} className="px-3 py-2 text-label-sm hover:bg-primary-container rounded-lg text-on-surface cursor-pointer flex gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">add_alert</span>
                      {notif}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-headline-sm">Ringkasan Sistem</h3>
                <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant/30 flex-wrap gap-1">
                  <button onClick={() => setDashboardRange('7d')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${dashboardRange === '7d' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>7 Hari</button>
                  <button onClick={() => setDashboardRange('1m')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${dashboardRange === '1m' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>1 Bulan</button>
                  <button onClick={() => setDashboardRange('1y')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${dashboardRange === '1y' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>1 Tahun</button>
                  <div className="flex items-center ml-2 pl-2 border-l border-outline-variant/30">
                    <button onClick={() => setDashboardRange('date')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors mr-2 ${dashboardRange === 'date' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>1 Hari:</button>
                    <input 
                      type="date" 
                      value={dashboardDate}
                      onChange={(e) => {
                        setDashboardDate(e.target.value);
                        setDashboardRange('date');
                      }}
                      className="bg-white px-2 py-1 border border-outline-variant/50 rounded text-sm focus:outline-primary"
                    />
                  </div>
                  <div className="flex items-center ml-2 pl-2 border-l border-outline-variant/30">
                    <button onClick={() => setDashboardRange('custom')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors mr-2 ${dashboardRange === 'custom' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Rentang:</button>
                    <input 
                      type="date" 
                      value={dashboardStartDate}
                      onChange={(e) => {
                        setDashboardStartDate(e.target.value);
                        setDashboardRange('custom');
                      }}
                      className="bg-white px-2 py-1 border border-outline-variant/50 rounded text-sm focus:outline-primary mr-2"
                    />
                    <span className="text-on-surface-variant text-sm mr-2">-</span>
                    <input 
                      type="date" 
                      value={dashboardEndDate}
                      onChange={(e) => {
                        setDashboardEndDate(e.target.value);
                        setDashboardRange('custom');
                      }}
                      className="bg-white px-2 py-1 border border-outline-variant/50 rounded text-sm focus:outline-primary"
                    />
                  </div>
                </div>
              </div>

              {analyticsMessage ? (
                <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 text-center">
                  <span className="material-symbols-outlined text-[64px] text-error mb-4">info</span>
                  <h3 className="font-headline-sm text-on-surface mb-2">Maaf, Data Belum Mencukupi</h3>
                  <p className="text-body-md text-on-surface-variant max-w-md">{analyticsMessage}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                      <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">payments</span>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Total Omset</p>
                        <h3 className="font-display-sm m-0">{formatPrice(analytics.total_omset)}</h3>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                      <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Pengeluaran (HPP)</p>
                        <h3 className="font-display-sm m-0 text-error">{formatPrice(analytics.total_hpp)}</h3>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                      <div className="w-12 h-12 rounded-full bg-tertiary-container text-tertiary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Laba Kotor</p>
                        <h3 className="font-display-sm m-0 text-tertiary">{formatPrice(analytics.profit)}</h3>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                      <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">savings</span>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Laba Bersih</p>
                        <h3 className={`font-display-sm m-0 ${analytics.profit < 0 ? 'text-error' : 'text-green-700'}`}>
                          {formatPrice(analytics.profit)}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30">
                      <h3 className="font-headline-sm mb-6">Grafik {dashboardRange === '7d' ? '7 Hari Terakhir' : dashboardRange === '1m' ? '1 Bulan Terakhir' : dashboardRange === '1y' ? '1 Tahun Terakhir' : dashboardRange === 'custom' ? `Rentang (${dashboardStartDate} s/d ${dashboardEndDate})` : `Harian (${dashboardDate})`}</h3>
                      <div className="h-[400px] w-full">
                        {analytics.chart_data && analytics.chart_data.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.chart_data} margin={{ top: 5, right: 20, bottom: 25, left: 20 }}>
                              <Line type="monotone" dataKey="omset" stroke="#006c4b" strokeWidth={4} name="Omset" activeDot={{ r: 8, strokeWidth: 0 }} />
                              <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={4} name="Profit (Laba)" activeDot={{ r: 8, strokeWidth: 0 }} />
                              <CartesianGrid stroke="#eee" strokeDasharray="5 5" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={15} />
                              <YAxis tickFormatter={(val) => `Rp${val/1000}k`} tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                              <Tooltip 
                                formatter={(value) => formatPrice(value as number)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '12px' }}
                                itemStyle={{ fontWeight: 'bold' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">analytics</span>
                            <p>Tidak ada data penjualan untuk rentang waktu ini.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 h-[400px] xl:h-auto">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-center">
                        <h3 className="font-headline-sm mb-2">Pesanan Aktif</h3>
                        <p className="text-body-sm text-on-surface-variant mb-4">Dalam rentang ini</p>
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <h2 className="text-[48px] font-display-lg text-primary m-0 leading-none">{analytics.recent_orders}</h2>
                            <p className="text-label-md text-on-surface-variant mt-2 font-bold">Transaksi Berhasil</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowOrderModal(true)}
                          className="w-full mt-6 py-2 border border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors"
                        >
                          Lihat Detail Laporan
                        </button>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest shrink-0">
                          <h3 className="font-bold text-label-lg">Rincian Data</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {analytics.chart_data && analytics.chart_data.length > 0 ? (
                            <table className="w-full text-left text-sm">
                              <thead className="bg-surface-container-lowest sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 font-bold border-b text-on-surface-variant">Periode</th>
                                  <th className="px-4 py-2 font-bold border-b text-on-surface-variant text-right">Omset</th>
                                  <th className="px-4 py-2 font-bold border-b text-on-surface-variant text-right">Profit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.chart_data.map((item, idx) => (
                                  <tr key={idx} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest/50">
                                    <td className="px-4 py-2 font-medium">{item.name}</td>
                                    <td className="px-4 py-2 text-right">{formatPrice(item.omset)}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${item.profit < 0 ? 'text-error' : 'text-green-600'}`}>
                                      {formatPrice(item.profit)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="flex items-center justify-center h-full text-sm text-on-surface-variant p-4">
                              Data tidak tersedia
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: KASIR (POS) */}
          {activeTab === 'pos' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col xl:flex-row gap-6 h-full min-h-[500px]">
              {/* Menu Grid */}
              <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 overflow-y-auto">
                <h3 className="font-headline-sm mb-6">Pilih Menu</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {menus.map(menu => (
                    <div 
                      key={menu.id} 
                      onClick={() => handlePOSAddToCart(menu)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${(menu.is_available && menu.stock > 0) ? 'hover:border-primary hover:bg-primary/5 border-outline-variant/50' : 'opacity-50 grayscale cursor-not-allowed bg-surface-container-highest border-outline-variant/30'}`}
                    >
                      <div className="aspect-video w-full rounded-lg bg-surface-container mb-3 overflow-hidden relative">
                        <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md font-bold">Stok: {menu.stock}</div>
                      </div>
                      <p className="font-bold text-body-md leading-snug line-clamp-2 mb-1">{menu.name}</p>
                      <p className="text-primary font-bold">{formatPrice(menu.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Pane */}
              <div className="w-full xl:w-[350px] bg-white rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col shrink-0">
                <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest rounded-t-2xl">
                  <h3 className="font-headline-sm m-0">Keranjang Kasir</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {posCart.length === 0 ? (
                    <div className="text-center text-on-surface-variant mt-10">
                      <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">shopping_cart</span>
                      <p className="text-body-md">Belum ada menu yang dipilih</p>
                    </div>
                  ) : (
                    posCart.map(item => (
                      <div key={item.menu_item_id} className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant/30 p-3 rounded-xl">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-body-md line-clamp-1">{item.name}</p>
                          <p className="text-label-sm text-on-surface-variant">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-surface rounded-lg px-2 py-1 border border-outline-variant/30">
                          <button onClick={() => handlePOSUpdateQuantity(item.menu_item_id, -1)} className="text-on-surface-variant hover:text-error">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="font-bold text-label-md w-4 text-center">{item.quantity}</span>
                          <button onClick={() => handlePOSUpdateQuantity(item.menu_item_id, 1)} className="text-on-surface-variant hover:text-primary">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-outline-variant/30">
                  <div className="mb-4">
                    <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Nama Pelanggan (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi" 
                      value={posCustomerName}
                      onChange={e => setPosCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant/50 rounded-lg text-body-md focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPosPaymentMethod('Cash')}
                        className={`py-2 rounded-lg font-bold border transition-colors ${posPaymentMethod === 'Cash' ? 'bg-primary-container text-primary border-primary' : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container'}`}
                      >
                        Tunai (Cash)
                      </button>
                      <button 
                        onClick={() => setPosPaymentMethod('QRIS')}
                        className={`py-2 rounded-lg font-bold border transition-colors ${posPaymentMethod === 'QRIS' ? 'bg-primary-container text-primary border-primary' : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container'}`}
                      >
                        QRIS
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/30 rounded-b-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-body-lg">Total</span>
                    <span className="font-headline-sm text-primary">{formatPrice(posTotal)}</span>
                  </div>
                  <button 
                    onClick={handlePOSSubmit}
                    disabled={posCart.length === 0 || isSubmittingPOS}
                    className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">point_of_sale</span>
                    {isSubmittingPOS ? 'Memproses...' : 'Simpan Pesanan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MANAJEMEN MENU */}
          {activeTab === 'menu' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm">Katalog Makanan</h3>
                <button onClick={() => { setEditingMenu(null); setShowMenuModal(true); }} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2">
                  <span className="material-symbols-outlined">add</span> Tambah Menu
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant/30 text-label-md text-on-surface-variant uppercase">
                      <th className="p-4 font-bold">Menu</th>
                      <th className="p-4 font-bold">Stok</th>
                      <th className="p-4 font-bold">Harga Jual</th>
                      <th className="p-4 font-bold">HPP / Modal</th>
                      <th className="p-4 font-bold text-center">Status</th>
                      <th className="p-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menus.map((m) => (
                      <tr key={m.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 flex items-center gap-4">
                          <img src={m.image_url} alt={m.name} className="w-12 h-12 rounded-lg object-cover bg-surface-container" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-on-surface text-label-lg">{m.name}</p>
                              {m.discount_percent && m.discount_percent > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Diskon {m.discount_percent}%</span>
                              ) : null}
                            </div>
                            <p className="text-body-sm text-on-surface-variant">{m.category_id === 2 ? 'Makanan Utama' : 'Cemilan'}</p>
                          </div>
                        </td>
                        <td className="p-4 font-medium">{m.stock}</td>
                        <td className="p-4 font-medium">{formatPrice(m.price)}</td>
                        <td className="p-4 text-error font-medium">{formatPrice(m.hpp)}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleMenuToggle(m.id, m.is_available)}
                            className={`px-3 py-1 rounded-full text-label-sm font-bold w-24 ${m.is_available ? 'bg-primary-container text-primary' : 'bg-error-container text-error'}`}
                          >
                            {m.is_available ? 'Tersedia' : 'Habis'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setEditingMenu(m); setShowMenuModal(true); }} className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button onClick={() => handleDeleteMenu(m.id)} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PROMO & BANNER */}
          {activeTab === 'promo' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-sm">Kode Promo Aktif</h3>
                  <button onClick={() => { setEditingPromo(null); setShowPromoModal(true); }} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span> Buat Promo
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-surface-container-lowest border-b border-outline-variant/30 text-label-md text-on-surface-variant uppercase">
                        <th className="p-4 font-bold">Kode</th>
                        <th className="p-4 font-bold">Diskon</th>
                        <th className="p-4 font-bold">Min Pembelian</th>
                        <th className="p-4 font-bold">Kedaluwarsa</th>
                        <th className="p-4 font-bold text-center">Status</th>
                        <th className="p-4 font-bold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map((p) => (
                        <tr key={p.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="p-4"><span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">{p.code}</span></td>
                          <td className="p-4">{p.discount_type === 'percentage' ? `${p.discount_value}%` : formatPrice(p.discount_value)}</td>
                          <td className="p-4">{formatPrice(p.min_purchase)}</td>
                          <td className="p-4 text-body-sm">{formatDate(p.expires_at)}</td>
                          <td className="p-4 text-center">
                            {new Date(p.expires_at) < new Date() ? (
                              <span className="inline-block px-3 py-1 rounded-full text-label-sm font-bold w-24 bg-surface-container-highest text-on-surface-variant border border-outline-variant/30">
                                Kedaluwarsa
                              </span>
                            ) : (
                              <button 
                                onClick={() => handlePromoToggle(p.id, p.is_active)}
                                className={`px-3 py-1 rounded-full text-label-sm font-bold w-24 ${p.is_active ? 'bg-primary-container text-primary' : 'bg-error-container text-error'}`}
                              >
                                {p.is_active ? 'Aktif' : 'Nonaktif'}
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => { setEditingPromo(p); setShowPromoModal(true); }} className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button onClick={() => handleDeletePromo(p.id)} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-surface-container-lowest p-8 rounded-[32px] shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-headline-sm mb-6">Informasi Dasar</h3>
                    <div className="mb-4">
                      <label className="text-label-sm font-bold text-on-surface-variant">Nama Toko</label>
                      <input type="text" defaultValue="GGS_WELL Official" className="w-full mt-1 p-3 rounded-xl bg-surface border border-outline-variant" />
                    </div>
                    <div className="mb-6">
                      <label className="text-label-sm font-bold text-on-surface-variant">No WhatsApp Admin</label>
                      <input type="text" defaultValue="081234567890" className="w-full mt-1 p-3 rounded-xl bg-surface border border-outline-variant" />
                    </div>
                    <button onClick={() => alert("Perubahan Info Toko berhasil disimpan!")} className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90">Simpan Perubahan</button>
                  </div>
                  <div>
                    <h3 className="font-headline-sm mb-6">Manajemen Banner</h3>
                    <label className="w-full h-32 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center flex-col text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors relative overflow-hidden mb-4">
                      <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                      <span className="material-symbols-outlined text-[28px] mb-1">upload_file</span>
                      <p className="text-label-sm font-bold">Unggah Banner Baru</p>
                    </label>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {banners.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-outline-variant">
                          <img src={b.image_url} className="w-24 h-12 object-cover rounded-md bg-surface-container" alt="banner" />
                          <div className="flex-1">
                            <p className="text-[10px] text-on-surface-variant">{new Date(b.created_at).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => handleBannerToggle(b.id, b.is_active)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${b.is_active ? 'bg-primary-container text-primary' : 'bg-error-container text-error'}`}
                          >
                            {b.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                          <button onClick={() => handleDeleteBanner(b.id)} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      ))}
                      {banners.length === 0 && <p className="text-label-sm text-on-surface-variant text-center mt-4">Belum ada banner diunggah.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TAB: LIVE CHAT */}
          {activeTab === 'live_chat' && (
            <AdminChatTab />
          )}

          {/* TAB: STORE LOCATION & SETTINGS */}
          {activeTab === 'store_location' && (
            <AdminStoreTab />
          )}
          
        </div>
      </main>

      {/* Modal Detail Order */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface">
              <h2 className="font-headline-sm font-bold text-primary">Detail Transaksi Masuk</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error/10">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-x-auto p-0">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-surface-container shadow-sm">
                  <tr className="text-label-md text-on-surface-variant uppercase">
                    <th className="p-4 font-bold">Order ID</th>
                    <th className="p-4 font-bold">Tanggal & Jam</th>
                    <th className="p-4 font-bold">Nama Pembeli</th>
                    <th className="p-4 font-bold">Metode Bayar</th>
                    <th className="p-4 font-bold text-right">Total Transaksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{o.order_id_string}</td>
                      <td className="p-4 text-body-md text-on-surface-variant">{formatDate(o.created_at)}</td>
                      <td className="p-4 font-bold">{o.user_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-surface-container border border-outline-variant/50 rounded text-label-sm font-bold">{o.payment_method}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-label-lg">{formatPrice(o.total_amount)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-on-surface-variant">Belum ada transaksi sukses.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Menu CRUD */}
      {showMenuModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface">
              <h2 className="font-headline-sm font-bold text-primary">{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <button onClick={() => setShowMenuModal(false)} className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error/10">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveMenu} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Nama Menu</label>
                <input required name="name" defaultValue={editingMenu?.name} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Deskripsi</label>
                <textarea required name="description" defaultValue={editingMenu?.description} className="w-full p-3 rounded-xl bg-surface border border-outline-variant resize-none" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Kategori</label>
                  <select name="category_id" defaultValue={editingMenu?.category_id || 2} className="w-full p-3 rounded-xl bg-surface border border-outline-variant">
                    <option value={2}>Makanan Utama</option>
                    <option value={3}>Minuman</option>
                    <option value={4}>Cemilan / Fast Food</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Harga Jual</label>
                  <input required type="number" name="price" defaultValue={editingMenu?.price} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">HPP / Modal</label>
                  <input required type="number" name="hpp" defaultValue={editingMenu?.hpp} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Stok Tersedia</label>
                  <input required type="number" name="stock" defaultValue={editingMenu?.stock ?? 0} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Diskon (%)</label>
                  <input type="number" min="0" max="100" name="discount_percent" defaultValue={editingMenu?.discount_percent ?? 0} placeholder="0" className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">URL Gambar</label>
                <input name="image_url" defaultValue={editingMenu?.image_url} placeholder="/images/example.png" className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowMenuModal(false)} className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-lg">Batal</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Promo CRUD */}
      {showPromoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface">
              <h2 className="font-headline-sm font-bold text-primary">{editingPromo ? 'Edit Promo' : 'Buat Promo'}</h2>
              <button onClick={() => setShowPromoModal(false)} className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error/10">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSavePromo} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Kode Promo</label>
                <input required name="code" defaultValue={editingPromo?.code} className="w-full p-3 rounded-xl bg-surface border border-outline-variant uppercase" placeholder="MERDEKA45" />
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Judul Promo</label>
                <input required name="title" defaultValue={editingPromo?.title} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Tipe Diskon</label>
                  <select name="discount_type" defaultValue={editingPromo?.discount_type || 'percentage'} className="w-full p-3 rounded-xl bg-surface border border-outline-variant">
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Nilai Diskon</label>
                  <input required type="number" name="discount_value" defaultValue={editingPromo?.discount_value} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Min. Pembelian (Rp)</label>
                  <input required type="number" name="min_purchase" defaultValue={editingPromo?.min_purchase} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Maks. Penggunaan</label>
                  <input required type="number" name="max_usage" defaultValue={editingPromo?.max_usage || 100} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
                </div>
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Kedaluwarsa</label>
                <input required type="date" name="expires_at" defaultValue={editingPromo?.expires_at ? editingPromo.expires_at.split('T')[0] : ''} className="w-full p-3 rounded-xl bg-surface border border-outline-variant" />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPromoModal(false)} className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-lg">Batal</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
