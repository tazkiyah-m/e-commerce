'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatedMarqueeHero } from '@/components/ui/hero-3';
import { ParallaxScrollFeature } from '@/components/ui/parallax-scroll-feature-section';
import { motion } from 'framer-motion';
import TestimonialMarqueeDemo from '@/components/ui/marquee-01';

interface ActiveBanner {
  id: number;
  image_url: string;
}

export default function Home() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<ActiveBanner[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
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

  const openMap = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${storeSettings.latitude},${storeSettings.longitude}`, '_blank');
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/6281234567890?text=Halo%20Admin%20GGS_WELL', '_blank');
  };

  useEffect(() => {
    fetchStoreSettings();

    // Fetch active banners
    fetch('http://localhost:8080/api/banners?active=true')
      .then(res => res.json())
      .then(data => setBanners(data || []))
      .catch(err => console.error(err));

    // Fetch menu items
    const fetchMenu = () => {
      fetch('http://localhost:8080/api/menu')
        .then(res => res.json())
        .then(data => {
          setMenuItems(data || []);
          setIsLoadingMenu(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingMenu(false);
        });
    };
    fetchMenu();

    const ws = new WebSocket('ws://localhost:8080/api/ws');
    ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
          const data = JSON.parse(event.data);
          if (data.type === 'STORE_SETTINGS_UPDATED') {
            fetchStoreSettings();
          }
          if (data.type === 'MENU_UPDATED') {
            fetchMenu();
          }
        }
      } catch (e) {
        // Silently ignore non-JSON websocket frames
      }
    };

    // Smooth reveal animations on scroll
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('transition-all', 'duration-[800ms]', 'ease-out', 'opacity-0', 'translate-y-8');
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      ws.close();
    };
  }, []);

  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Hero Section ── */}
      <div id="home">
      <AnimatedMarqueeHero
        tagline="Gourmet Experience"
        title={
          <>
            Nikmati Kuliner
            <br />
            <span className="text-[#86868b]">Premium.</span>
          </>
        }
        description="Pengiriman cepat. Rasa autentik. Kualitas terjamin."
        ctaText="Pesan Sekarang"
        images={menuItems.map(item => item.image_url)}
        isLoading={isLoadingMenu}
      />
      </div>

      {/* ── Promo Banner — Apple-style Horizontal Scroll ── */}
      <motion.section 
        id="promo" 
        className="w-full py-20 bg-[#f5f5f7] overflow-hidden scroll-mt-24"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-[1024px] mx-auto px-6 text-center mb-12">
          <p className="text-[#86868b] text-[12px] font-medium tracking-widest uppercase mb-3">Promo</p>
          <h2 className="text-[48px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.07] text-[#1d1d1f]">
            Penawaran Spesial.
          </h2>
          <p className="mt-4 text-[21px] text-[#86868b] font-normal">
            Nikmati hidangan terbaik dengan harga istimewa.
          </p>
        </div>
        
        {banners.length > 0 ? (
          <div className="w-full overflow-x-auto scrollbar-hide px-6 md:px-12 pb-4">
            <div className="flex gap-5 w-max mx-auto">
              {banners.map((item, idx) => (
                <Link href="/menu" key={item.id}>
                  <div className="relative w-[85vw] md:w-[600px] aspect-[16/9] rounded-2xl overflow-hidden flex-shrink-0 group cursor-pointer">
                    <img 
                      src={item.image_url} 
                      alt={`Promo ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-medium tracking-wide mb-2">
                        Penawaran Terbatas
                      </span>
                      <p className="text-white text-[24px] md:text-[28px] font-semibold tracking-tight">
                        Promo Spesial {idx + 1}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-[#86868b] text-[17px]">
            Memuat promo...
          </div>
        )}
      </motion.section>

      {/* ── Menu Parallax Story ── */}
      <section id="story" className="scroll-mt-24">
      <ParallaxScrollFeature 
        label="Fakta Kami"
        introTitle="Di Balik Kualitas Kami."
        sections={[
          {
            id: 'stat-1',
            title: "Proses Lama. Hasil Sempurna.",
            description: "Daging direndam bumbu khas selama belasan jam dan dipanggang lambat untuk memastikan setiap gigitan lumer di mulut Anda.",
            statNumber: "12 Jam",
            statLabel: "Slow Roasted",
          },
          {
            id: 'stat-2',
            title: "Dari Alam ke Meja Anda.",
            description: "Kami bekerja sama dengan puluhan petani lokal untuk memastikan setiap sayuran dan bumbu yang Anda nikmati 100% segar dan organik.",
            statNumber: "100%",
            statLabel: "Lokal & Organik",
            reverse: true
          },
          {
            id: 'stat-3',
            title: "Kepuasan di Setiap Porsi.",
            description: "Setiap harinya, ratusan porsi terjual karena pelanggan kami tahu di mana mencari kualitas rasa yang konsisten.",
            statNumber: "500+",
            statLabel: "Porsi Terjual / Hari",
          },
          {
            id: 'stat-4',
            title: "Resep Rahasia Keluarga.",
            description: "Tidak ada pengawet. Tidak ada penyedap buatan. Hanya resep turun temurun yang disempurnakan selama lebih dari dua dekade.",
            statNumber: "20 Thn",
            statLabel: "Warisan Rasa",
            reverse: true
          }
        ]}
      />
      </section>

      {/* ── Testimonials Section ── */}
      <motion.section 
        id="testimonials" 
        className="w-full bg-[#f5f5f7] pt-24 pb-12 scroll-mt-24"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-[1024px] mx-auto px-6 text-center mb-12">
          <p className="text-[#86868b] text-[12px] font-medium tracking-widest uppercase mb-3">Testimonial</p>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-[-0.03em] leading-[1.07] text-[#1d1d1f]">
            Cerita dari pelanggan setia xGGSx.
          </h2>
        </div>
        <TestimonialMarqueeDemo />
      </motion.section>

      {/* ── Location Section ── */}
      <motion.section 
        id="location" 
        className="w-full bg-[#f5f5f7] py-24 scroll-mt-24"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-[1024px] mx-auto px-6">
          
          {/* Title */}
          <div className="text-center mb-16">
            <p className="text-[#86868b] text-[12px] font-medium tracking-widest uppercase mb-3">Location</p>
            <h2 className="text-[48px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.07] text-[#1d1d1f]">
              Kunjungi Kami.
            </h2>
            <p className="mt-4 text-[21px] text-[#86868b] font-normal max-w-lg mx-auto">
              Di jantung kota Jakarta, kualitas terjaga hingga ke tangan Anda.
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-[11px] text-[#86868b] font-medium tracking-widest uppercase mb-2">Alamat Toko</p>
                  <p className="text-[15px] text-[#1d1d1f] leading-relaxed font-medium">
                    {storeSettings.address}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#86868b] font-medium tracking-widest uppercase mb-2">Jam Operasional</p>
                  <p className="text-[15px] text-[#1d1d1f] leading-relaxed font-medium">
                    Setiap Hari<br/>10:00 – 22:00 WITA
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button onClick={openMap} className="px-6 py-2.5 rounded-full bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-[#000] transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                  <span>Dapatkan Navigasi</span>
                </button>
                <button onClick={openWhatsApp} className="px-6 py-2.5 rounded-full border border-[#1d1d1f] text-[#1d1d1f] text-[14px] font-medium hover:bg-[#1d1d1f] hover:text-white transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Hubungi Admin</span>
                </button>
              </div>
            </div>
            
            {/* Map Visual */}
            <div className="relative">
              <div className="w-full aspect-video lg:aspect-square bg-white rounded-3xl overflow-hidden relative border border-[#d2d2d7]/50 shadow-md">
                <iframe
                  key={`${storeSettings.latitude}-${storeSettings.longitude}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${storeSettings.longitude - 0.005},${storeSettings.latitude - 0.005},${storeSettings.longitude + 0.005},${storeSettings.latitude + 0.005}&layer=mapnik&marker=${storeSettings.latitude},${storeSettings.longitude}`}
                  className="w-full h-full"
                ></iframe>
                
                {/* Overlay Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#d2d2d7]/40 shadow-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <div>
                      <p className="text-[12px] font-bold text-[#1d1d1f]">Lokasi Resto GGS_WELL</p>
                      <p className="text-[10px] text-[#86868b] truncate max-w-[200px]">{storeSettings.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
