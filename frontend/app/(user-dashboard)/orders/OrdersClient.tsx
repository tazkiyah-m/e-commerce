'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useRouter, useSearchParams } from 'next/navigation';

interface OrderItem {
  menu_item_id: number;
  name: string;
  image_url: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersClient() {
  const { user, isAuthenticated } = useAuth();
  const { fetchCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const showSuccess = searchParams.get('success') === '1';

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/orders/user?user_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (orderId: number) => {
    if (isReordering) return;
    setIsReordering(true);
    try {
      const res = await fetch('http://localhost:8080/api/cart/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          order_id: orderId
        })
      });

      if (res.ok) {
        await fetchCart();
        router.push('/checkout');
      } else {
        alert("Gagal melakukan re-order.");
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsReordering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex w-full min-h-[50vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto px-gutter-desktop pb-12 w-full">
      <div className="mb-8">
        <h1 className="text-display-sm font-display-sm font-bold text-on-surface">Riwayat Pembelian</h1>
        <p className="text-body-lg text-on-surface-variant mt-2">Daftar transaksi dan pesanan Anda sebelumnya.</p>
      </div>

      {showSuccess && (
        <div className="mb-8 p-4 bg-primary-container text-on-primary-container rounded-xl border border-primary/20 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <div>
            <p className="font-bold">Pembayaran Berhasil!</p>
            <p className="text-body-md opacity-90">Pesanan Anda sedang diproses dan telah ditambahkan ke riwayat.</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">receipt_long</span>
          <h2 className="text-headline-sm font-bold text-on-surface">Belum ada pesanan</h2>
          <p className="text-body-md text-on-surface-variant mt-2">Anda belum melakukan pembelian apapun.</p>
          <button 
            onClick={() => router.push('/menu')}
            className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors"
          >
            Pesan Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row gap-6">
              
              {/* Order Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                  <div>
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">Order #{order.id}</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-label-sm font-bold">
                    {order.status.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-4">
                  {(order.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="font-bold text-label-lg">{item.name}</p>
                        <p className="text-body-sm text-on-surface-variant">{item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                      <div className="font-bold text-label-md">
                        {formatPrice(item.quantity * item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary & Actions */}
              <div className="md:w-64 bg-surface-container-low p-4 rounded-xl flex flex-col justify-between">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Ongkir</span>
                    <span>{formatPrice(order.shipping_fee)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-body-sm text-error">
                      <span>Diskon</span>
                      <span>-{formatPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-outline-variant/30 flex justify-between font-bold text-label-lg mt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total_amount)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleReorder(order.id)}
                  disabled={isReordering}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                  {isReordering ? 'Memproses...' : 'Pesan Lagi'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
