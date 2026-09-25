'use client';

import { useState, useEffect } from 'react';

export default function AdminStoreTab() {
  const [address, setAddress] = useState('Jl. Pallantikang No. 88, Makassar');
  const [driverPhone, setDriverPhone] = useState('089653903519');
  const [deliveryFee, setDeliveryFee] = useState<number>(5000);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchStoreSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/store/location');
      if (res.ok) {
        const data = await res.json();
        if (data.address) setAddress(data.address);
        if (data.driver_phone) setDriverPhone(data.driver_phone);
        if (data.delivery_fee) setDeliveryFee(data.delivery_fee);
      }
    } catch (e) {
      console.error("Failed to load store settings", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/admin/store/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          driver_phone: driverPhone,
          delivery_fee: Number(deliveryFee),
          latitude: -5.14766,
          longitude: 119.4327,
          max_delivery_km: 5.0
        })
      });

      if (res.ok) {
        setToastMsg('✨ Pengaturan Toko & Kontak Driver WA Berhasil Disimpan!');
        setTimeout(() => setToastMsg(''), 4000);
      } else {
        alert('Gagal menyimpan pengaturan toko.');
      }
    } catch (e) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      {/* Toast alert */}
      {toastMsg && (
        <div className="p-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg text-[14px] flex items-center gap-3 animate-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-[24px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 border border-outline-variant/30 shadow-sm space-y-6">
        <div className="border-b border-outline-variant/30 pb-6">
          <h2 className="font-bold text-headline-sm text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">storefront</span>
            Pengaturan Toko & Pengantaran Driver WA
          </h2>
          <p className="text-label-sm text-on-surface-variant mt-1">
            Atur alamat toko dan nomor WhatsApp Driver untuk mempermudah pelanggan mengirimkan lokasi/alamat via WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Alamat Lengkap Toko */}
          <div>
            <label className="text-label-sm font-bold text-on-surface-variant block mb-2 uppercase tracking-wider">
              Alamat Lengkap Toko / Resto
            </label>
            <textarea 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              rows={3} 
              required
              placeholder="Contoh: Jl. Pallantikang No. 88, Makassar, Sulawesi Selatan"
              className="w-full p-4 rounded-2xl bg-surface border border-outline-variant focus:border-primary focus:outline-none font-medium text-[14px]"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nomor WhatsApp Driver */}
            <div>
              <label className="text-label-sm font-bold text-on-surface-variant block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">chat</span>
                No. WhatsApp Driver Resto
              </label>
              <input 
                type="text" 
                value={driverPhone} 
                onChange={(e) => setDriverPhone(e.target.value)} 
                required
                placeholder="Contoh: 081234567890"
                className="w-full p-3.5 rounded-2xl bg-surface border border-outline-variant focus:border-primary focus:outline-none font-bold text-[14px] text-emerald-950 bg-emerald-50 border-emerald-200"
              />
            </div>

            {/* Biaya Ongkir Standar */}
            <div>
              <label className="text-label-sm font-bold text-on-surface-variant block mb-2 uppercase tracking-wider">
                Biaya Ongkir Flat (Rp)
              </label>
              <input 
                type="number" 
                value={deliveryFee} 
                onChange={(e) => setDeliveryFee(Number(e.target.value))} 
                required
                placeholder="Contoh: 5000"
                className="w-full p-3.5 rounded-2xl bg-surface border border-outline-variant focus:border-primary focus:outline-none font-bold text-[14px]"
              />
            </div>
          </div>

          {/* WhatsApp Delivery Explanation Box */}
          <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-300/60 space-y-2 text-emerald-950 text-[13px]">
            <p className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-emerald-700">delivery_dining</span>
              Alur Pengantaran Driver WhatsApp:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[12px] opacity-90">
              <li>Pelanggan memilih <strong>Pesan Antar</strong> di halaman Checkout.</li>
              <li>Sistem menyediakan tombol langsung <strong>"Hubungi Driver via WhatsApp"</strong> yang otomatis terisi ID Pesanan & Daftar Menu.</li>
              <li>Pelanggan tinggal mengirimkan <strong>Share Location / Alamat Tujuan</strong> secara langsung ke WhatsApp Driver.</li>
            </ul>
          </div>

          {/* Submit button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl text-[15px] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>{isLoading ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
