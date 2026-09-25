'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Checkout() {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const [inputPromo, setInputPromo] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');

  const { items: cartItems, subtotal, total, promoDiscount, promoCode, cartCount, clearCart, applyPromo } = useCart();

  useEffect(() => {
    // Load Midtrans Snap script
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "Mid-client-Jflt9jCeevp8oAAY";
    const script = document.createElement("script");
    script.src = snapScript;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [fulfillmentType, setFulfillmentType] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in');
  const [storeSettings, setStoreSettings] = useState<any>({
    address: 'Jl. Pallantikang No. 88, Makassar',
    driver_phone: '089653903519',
    delivery_fee: 5000
  });

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.full_name) setCustomerName(user.full_name);
  }, [user]);

  // Fetch Store Settings from API
  const fetchStoreSettings = () => {
    fetch('http://localhost:8080/api/store/location')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setStoreSettings(data);
        }
      })
      .catch(err => console.error("Failed to load store settings", err));
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const shippingFee = fulfillmentType === 'delivery' ? (storeSettings.delivery_fee || 5000) : 0;
  const finalTotal = total + shippingFee;

  const handleApplyPromo = async () => {
    if (!inputPromo) return;
    setIsApplyingPromo(true);
    setPromoMessage('');
    try {
      const res = await applyPromo(inputPromo);
      setPromoMessage(res.message);
      if (res.isValid) {
        setInputPromo('');
      }
    } catch (e) {
      setPromoMessage('Gagal memeriksa promo.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const driverPhoneFormatted = (storeSettings.driver_phone || '089653903519').replace(/^0/, '62').replace(/\D/g, '');

  const openDriverWhatsApp = (orderId?: number) => {
    const text = encodeURIComponent(
      `Halo Driver GGS_WELL! Saya memesan dengan ID Pesanan #${orderId || createdOrderId || ''}.\n` +
      `Nama: ${customerName || user?.full_name || 'Pelanggan'}\n` +
      `Metode: Pesan Antar\n\n` +
      `Saya ingin mengirimkan Share Location / Alamat tujuan pengantaran saya.`
    );
    window.open(`https://wa.me/6289653903519?text=${text}`, '_blank');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartCount === 0) return;

    if (fulfillmentType === 'dine_in' && !tableNumber.trim()) {
      alert("Mohon masukkan Nomor Meja / Area Tempat Duduk Anda di resto.");
      return;
    }
    
    setIsProcessing(true);
    const finalAddressNotes = fulfillmentType === 'dine_in'
      ? `Makan di Tempat - Meja: ${tableNumber}`
      : fulfillmentType === 'pickup'
      ? 'Ambil Sendiri di Toko (Self-Pickup)'
      : address || 'Kirim via WhatsApp Driver';

    try {
      const res = await fetch('http://localhost:8080/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment_type: fulfillmentType,
          address: finalAddressNotes,
          customer_name: customerName || user?.full_name || 'Pelanggan',
          customer_phone: customerPhone,
          items: cartItems.map(item => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price: item.price
          })),
          promo_code: promoCode,
          shipping_fee: shippingFee,
          total_amount: finalTotal
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order_id) setCreatedOrderId(data.order_id);

        if (data.snap_token && (window as any).snap) {
          (window as any).snap.pay(data.snap_token, {
            onSuccess: function () {
              setPaymentSuccess(true);
              clearCart();
            },
            onPending: function () {
              setPaymentSuccess(true);
              clearCart();
            },
            onError: function () {
              alert("Pembayaran gagal. Silakan coba lagi.");
              setIsProcessing(false);
            },
            onClose: function () {
              setIsProcessing(false);
              alert("Anda menutup pop-up sebelum menyelesaikan pembayaran. Pesanan Anda belum dibayar.");
            }
          });
        } else {
          setPaymentSuccess(true);
          clearCart();
        }
      } else {
        const errorText = await res.text();
        alert(errorText || "Gagal memproses pesanan.");
        setIsProcessing(false);
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative min-h-screen bg-surface">
      <main className="w-full pt-20 bg-surface flex-1">
        <form id="checkout-form" onSubmit={handleCheckout} className="flex flex-col w-full">
          
          {/* Status Progress Bar */}
          <div className="w-full max-w-container-max mx-auto px-gutter-desktop py-8 hidden md:block">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md">1</span>
                <span className="font-label-md text-on-surface">Keranjang</span>
              </div>
              <div className="h-px w-12 bg-outline-variant"></div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md">2</span>
                <span className="font-label-md text-on-surface font-bold">Pembayaran</span>
              </div>
              <div className="h-px w-12 bg-outline-variant"></div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-label-md">3</span>
                <span className="font-label-md text-on-surface-variant">Selesai</span>
              </div>
            </div>
          </div>

          {/* Main Checkout Grid */}
          <div className="max-w-container-max mx-auto px-gutter-desktop pb-24 w-full">
            <div className="flex items-center gap-3 pb-6 md:hidden">
              <button type="button" onClick={() => router.back()} className="material-symbols-outlined text-[32px] text-primary hover:scale-110 transition-transform">arrow_back</button>
              <h1 className="font-display-lg text-headline-md m-0">Checkout</h1>
            </div>

            <div className="flex flex-col lg:flex-row w-full gap-8 items-start">
              
              {/* Left Column */}
              <div className="flex-1 min-w-0 flex flex-col gap-8">
                
                {/* 1. Metode Pemenuhan Pesanan */}
                <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/30 space-y-6">
                  <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                    <span className="material-symbols-outlined text-primary text-[28px]">storefront</span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm tracking-tight m-0">Metode Pemesanan</h2>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">Pilih Makan di Tempat, Ambil Sendiri, atau Pesan Antar Driver WA</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Option 1: Dine-In (Sudah di Resto) */}
                    <label 
                      onClick={() => setFulfillmentType('dine_in')}
                      className={`relative flex items-start p-5 rounded-2xl border cursor-pointer transition-all ${
                        fulfillmentType === 'dine_in' 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-outline-variant/60 hover:border-primary/50 bg-white'
                      }`}
                    >
                      <input type="radio" name="fulfillment" checked={fulfillmentType === 'dine_in'} readOnly className="mt-1 text-primary" />
                      <div className="flex-1 ml-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-on-surface">Makan di Tempat (Sudah di Resto)</span>
                            <span className="px-2.5 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px] uppercase">
                              🍽️ Di Resto — Rp 0
                            </span>
                          </div>
                          <span className="font-bold text-emerald-700 text-[13px]">Rp 0</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                          Sudah berada di tempat duduk resto? Pesan via web → Dapur memasak → Makanan diantarkan langsung ke meja Anda tanpaperlu antre di kasir!
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Pickup (Takeaway) */}
                    <label 
                      onClick={() => setFulfillmentType('pickup')}
                      className={`relative flex items-start p-5 rounded-2xl border cursor-pointer transition-all ${
                        fulfillmentType === 'pickup' 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-outline-variant/60 hover:border-primary/50 bg-white'
                      }`}
                    >
                      <input type="radio" name="fulfillment" checked={fulfillmentType === 'pickup'} readOnly className="mt-1" />
                      <div className="flex-1 ml-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-on-surface">Ambil Sendiri di Toko (Self-Pickup)</span>
                            <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-bold rounded-full text-[10px] uppercase">
                              ⚡ Bebas Antre — Rp 0
                            </span>
                          </div>
                          <span className="font-bold text-emerald-700 text-[13px]">Rp 0</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                          Pesan dari rumah / perjalanan → Dapur memasak → Datang langsung ambil pesanan di kasir toko tanpa mengantre.
                        </p>
                      </div>
                    </label>
                    
                    {/* Option 3: Delivery via Driver WA */}
                    <label
                      onClick={() => setFulfillmentType('delivery')}
                      className={`relative flex items-start p-5 rounded-2xl border cursor-pointer transition-all ${
                        fulfillmentType === 'delivery' 
                          ? 'border-emerald-600 bg-emerald-500/5 shadow-sm' 
                          : 'border-outline-variant/60 hover:border-emerald-600/50 bg-white'
                      }`}
                    >
                      <input type="radio" name="fulfillment" checked={fulfillmentType === 'delivery'} readOnly className="mt-1 text-emerald-600" />
                      <div className="flex-1 ml-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-on-surface">Pesan Antar (Driver WhatsApp)</span>
                            <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-bold rounded-full text-[10px] uppercase">
                              🛵 Chat Driver WA
                            </span>
                          </div>
                          <span className="font-bold text-emerald-800 text-[13px]">
                            +Rp {(storeSettings.delivery_fee || 5000).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                          Pengantaran oleh Driver Resto. Setelah memesan, Anda dapat langsung mengirimkan Share Location / Alamat ke WA Driver.
                        </p>
                      </div>
                    </label>
                  </div>
                </section>

                {/* 2. Informasi Pelanggan & Alamat / Nomor Meja */}
                <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/30">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-primary">person</span>
                    <h2 className="font-headline-sm text-headline-sm tracking-tight m-0">Informasi Pemesan</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Nama Pemesan</label>
                      <input 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-all text-body-md font-medium" 
                        placeholder="Masukkan nama Anda" 
                        type="text" 
                        required 
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Nomor WhatsApp Pelanggan</label>
                      <input 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-all text-body-md font-medium" 
                        placeholder="Contoh: 081234567890" 
                        type="tel" 
                      />
                    </div>

                    {/* Dynamic field based on fulfillmentType */}
                    {fulfillmentType === 'dine_in' && (
                      <div className="flex flex-col gap-2 p-5 bg-amber-500/10 rounded-2xl border border-amber-300/60 animate-in fade-in">
                        <label className="font-label-sm text-amber-950 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-700 text-[18px]">table_restaurant</span>
                          Nomor Meja / Lokasi Tempat Duduk Anda di Resto
                        </label>
                        <input 
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="Contoh: Meja No. 05, atau Area Outdoor No. 02"
                          className="w-full p-3.5 rounded-xl bg-white border border-amber-300 focus:border-primary focus:outline-none text-[14px] font-bold text-amber-950"
                          required
                        />
                        <p className="text-[11px] text-amber-900 font-medium mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          Pelayan resto akan membawakan pesanan Anda langsung ke meja ini.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. Pembayaran */}
                <section className="bg-surface-container-lowest overflow-hidden rounded-xl shadow-sm border border-outline-variant/30">
                  <div className="bg-primary p-6 text-on-primary">
                    <h2 className="font-headline-sm text-headline-sm mb-1 m-0">Pembayaran Online</h2>
                    <p className="text-label-sm opacity-80 uppercase tracking-widest">Didukung oleh Midtrans</p>
                  </div>
                  
                  <div className="p-8 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                      <span className="material-symbols-outlined text-[40px]">security</span>
                    </div>
                    <h3 className="font-headline-sm text-center mb-2">Pembayaran Aman Midtrans</h3>
                    <p className="text-on-surface-variant text-label-md text-center max-w-sm mb-4">
                      Klik <strong>Bayar Sekarang</strong> di bawah untuk memilih metode pembayaran QRIS, Bank Transfer, atau E-Wallet.
                    </p>
                  </div>
                </section>
              </div>

              {/* Right Column: Summary */}
              <aside className="w-full lg:w-[400px] shrink-0">
                <div className="sticky top-28 bg-surface-container-lowest p-8 rounded-xl shadow-xl border border-outline-variant/30">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-primary">shopping_bag</span>
                    <h2 className="font-headline-sm text-headline-sm tracking-tight m-0">Ringkasan Pesanan</h2>
                  </div>
                  
                  <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.length === 0 ? (
                      <p className="text-center text-on-surface-variant py-4">Keranjang kosong</p>
                    ) : (
                      cartItems.map((item) => (
                        <div key={item.menu_item_id} className="flex items-center gap-4">
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-16 h-16 rounded-lg object-cover bg-surface-container"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-label-md text-on-surface truncate">{item.name}</h4>
                            <p className="text-label-sm text-on-surface-variant">{item.quantity}x Unit</p>
                          </div>
                          <span className="font-label-md text-on-surface">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="pt-4 pb-2 border-t border-outline-variant/30 mt-4">
                    <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Kode Promo</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="MakanMurah" 
                        value={inputPromo}
                        onChange={(e) => setInputPromo(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 rounded-lg bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-all text-body-md font-mono"
                      />
                      <button 
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!inputPromo || isApplyingPromo}
                        className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg font-label-md hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isApplyingPromo ? 'Mengecek...' : 'Terapkan'}
                      </button>
                    </div>
                    {promoMessage && (
                      <p className={`text-label-sm mt-2 font-bold ${promoCode && promoMessage.includes('berhasil') ? 'text-primary' : 'text-error'}`}>
                        {promoMessage}
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-6 border-t border-outline-variant/30 space-y-3">
                    <div className="flex justify-between text-label-md text-on-surface-variant">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-label-md text-on-surface-variant">
                      <span>Ongkos Kirim</span>
                      <span>Rp {shippingFee.toLocaleString('id-ID')}</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-label-md text-error">
                        <span>Diskon ({promoCode})</span>
                        <span>-Rp {promoDiscount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-headline-sm font-bold text-on-surface pt-4">
                      <span>Total Tagihan</span>
                      <span className="text-primary">Rp {finalTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="pt-8 mt-2 space-y-3">
                    <button 
                      type="submit"
                      disabled={cartCount === 0 || isProcessing}
                      className="w-full bg-primary text-on-primary py-4 rounded-full font-label-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
                    </button>

                    {fulfillmentType === 'delivery' && (
                      <button
                        type="button"
                        onClick={() => openDriverWhatsApp()}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-[13px] transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        <span>Chat Driver WA (Kirim Alamat / Share Loc)</span>
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* Success Modal */}
          {paymentSuccess && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"></div>
              <div className="relative bg-surface-container-lowest w-full max-w-md p-8 rounded-3xl shadow-2xl text-center animate-in zoom-in-95 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <span className="material-symbols-outlined text-[48px]">check_circle</span>
                </div>
                <div>
                  <h2 className="font-display-lg text-headline-md mb-2">Pesanan Berhasil Dibuat!</h2>
                  <p className="text-body-md text-on-surface-variant">Terima kasih. Pesanan Anda sedang disiapkan oleh Dapur Resto.</p>
                </div>

                {fulfillmentType === 'dine_in' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 font-bold text-[13px]">
                    🍽️ Pesanan Makan di Tempat (Meja: {tableNumber}) siap disajikan langsung ke meja Anda!
                  </div>
                )}

                {fulfillmentType === 'delivery' && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                    <p className="text-[12px] font-bold text-emerald-950">
                      🚗 Kirim Alamat Tujuan / Share Location ke Driver WA:
                    </p>
                    <button
                      type="button"
                      onClick={() => openDriverWhatsApp()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-[13px] transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                      <span>Chat Driver WA Sekarang</span>
                    </button>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={() => router.push('/orders')}
                  className="w-full py-3 bg-primary text-on-primary font-bold rounded-2xl text-[14px]"
                >
                  Lihat Riwayat Pesanan Saya
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
