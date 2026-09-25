'use client';

import { useState, useEffect } from 'react';

export default function Location() {
  const [storeSettings, setStoreSettings] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  }>({
    address: 'Jl. Pallantikang No. 88, Makassar',
    latitude: -5.14766,
    longitude: 119.4327
  });

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/store/location');
      if (res.ok) {
        const data = await res.json();
        setStoreSettings({
          address: data.address || 'Jl. Pallantikang No. 88, Makassar',
          latitude: data.latitude || -5.14766,
          longitude: data.longitude || 119.4327
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStoreSettings();

    const ws = new WebSocket('ws://localhost:8080/api/ws');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STORE_SETTINGS_UPDATED') {
          fetchStoreSettings();
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, []);

  const openMap = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${storeSettings.latitude},${storeSettings.longitude}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full relative min-h-screen py-24 bg-surface-container-lowest animate-in fade-in">
      <div className="max-w-4xl mx-auto px-6 w-full space-y-12">
        <div className="text-center space-y-4">
          <h1 className="font-bold text-display-md text-primary">Lokasi Resto GGS_WELL</h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Temukan lokasi fisik restoran kami dan dapatkan rute navigasi langsung.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-outline-variant/30 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-primary tracking-widest uppercase block mb-1">Alamat Lengkap</span>
              <p className="font-bold text-[16px] text-on-surface leading-snug">
                {storeSettings.address}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-primary tracking-widest uppercase block mb-1">Jam Operasional</span>
              <p className="font-medium text-[14px] text-on-surface-variant">
                Setiap Hari: 10:00 – 22:00 WITA
              </p>
            </div>

            <button 
              onClick={openMap}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-on-primary font-bold rounded-2xl text-[14px] hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">near_me</span>
              <span>Dapatkan Navigasi Google Maps</span>
            </button>
          </div>

          <div className="h-72 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner relative bg-slate-100">
            <iframe
              key={`${storeSettings.latitude}-${storeSettings.longitude}`}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${storeSettings.longitude - 0.005},${storeSettings.latitude - 0.005},${storeSettings.longitude + 0.005},${storeSettings.latitude + 0.005}&layer=mapnik&marker=${storeSettings.latitude},${storeSettings.longitude}`}
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
