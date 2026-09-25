'use client';

import { useState, useEffect, useRef } from 'react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, lat: number, lon: number) => void;
  currentAddress?: string;
  pinLabel?: string;
  initialLat?: number;
  initialLon?: number;
  storeSettings?: {
    address: string;
    latitude: number;
    longitude: number;
    max_delivery_km: number;
  };
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  currentAddress = '',
  pinLabel = '📍 Lokasi Kirim Di Sini',
  initialLat,
  initialLon,
  storeSettings
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Store coordinates fallback
  const storeLat = storeSettings?.latitude || -5.14766;
  const storeLon = storeSettings?.longitude || 119.4327;
  const maxKm = storeSettings?.max_delivery_km || 5.0;

  // Haversine Distance Calculator
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Map state
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(
    initialLat && initialLon ? { lat: initialLat, lon: initialLon } : null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number }>({
    lat: initialLat || -5.14766,
    lon: initialLon || 119.4327
  });

  // Sync mapCenter when modal opens with initial coordinates
  useEffect(() => {
    if (isOpen && initialLat && initialLon) {
      setMapCenter({ lat: initialLat, lon: initialLon });
      setSelectedCoords({ lat: initialLat, lon: initialLon });
    }
  }, [isOpen, initialLat, initialLon]);
  const [mapAddress, setMapAddress] = useState<string>('');
  const [isMapLocating, setIsMapLocating] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // Initialize Leaflet Interactive Map when showMapPicker opens
  useEffect(() => {
    if (!showMapPicker) return;

    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => initLeafletMap();
        document.body.appendChild(script);
      } else {
        setTimeout(initLeafletMap, 100);
      }
    };

    loadLeaflet();
  }, [showMapPicker]);

  const initLeafletMap = () => {
    const L = (window as any).L;
    if (!L) return;

    const container = document.getElementById('leaflet-interactive-map');
    if (!container) return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch(e){}
    }

    const map = L.map('leaflet-interactive-map', {
      center: [mapCenter.lat, mapCenter.lon],
      zoom: 16,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap & CartoDB'
    }).addTo(map);

    // Sync map center to state on pan / drag / move
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenter({ lat: c.lat, lon: c.lng });
      reverseGeocode(c.lat, c.lng);
    });

    // Click anywhere on map to center pin
    map.on('click', (e: any) => {
      map.panTo(e.latlng);
      setMapCenter({ lat: e.latlng.lat, lon: e.latlng.lng });
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
  };

  // Saved / Recent Addresses
  const [recentAddresses, setRecentAddresses] = useState<any[]>([
    {
      id: 'fav-1',
      title: 'Rumah',
      address: 'Jl. Pallantikang Lorong 1 No.5, Kalegowa, Kec. Somba Opu, Kabupaten Gowa, Sulawesi Selatan 92114',
      lat: -5.2045,
      lon: 119.4520,
      isFavorite: true,
      icon: 'home'
    },
    {
      id: 'rec-1',
      title: 'Jl. Pallantikang Lorong 1 No.5',
      address: 'Jl. Pallantikang Lorong 1 No.5, Kalegowa, Kec. Somba Opu, Kabupaten Gowa, Sulawesi Selatan 92114',
      lat: -5.2045,
      lon: 119.4520,
      icon: 'history'
    },
    {
      id: 'rec-2',
      title: 'Masjid Almusawir',
      address: 'Jl. RS Islam Faisal VII No.18, Banta-Bantaeng, Rappocini, Sulawesi Selatan 90222',
      lat: -5.1680,
      lon: 119.4350,
      icon: 'history'
    },
    {
      id: 'rec-3',
      title: 'Rumah Sakit Awal Bros',
      address: 'Jalan Urip Sumoharjo, Karuwisi Utara, Panakkukang, Kota Makassar, Sulawesi Selatan',
      lat: -5.1380,
      lon: 119.4480,
      icon: 'history'
    }
  ]);

  // Search Address via OpenStreetMap Nominatim API
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=id`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced reverse geocode when map center changes
  useEffect(() => {
    if (!showMapPicker) return;

    const timer = setTimeout(() => {
      reverseGeocode(mapCenter.lat, mapCenter.lon);
    }, 500);

    return () => clearTimeout(timer);
  }, [showMapPicker, mapCenter.lat, mapCenter.lon]);

  const reverseGeocode = async (lat: number, lon: number) => {
    setIsMapLocating(true);
    try {
      // Primary: BigDataCloud Reverse Geocoding (fast, no rate-limit blocking)
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
      if (res.ok) {
        const data = await res.json();
        const parts = [
          data.locality || data.city || data.localityInfo?.administrative?.[2]?.name,
          data.principalSubdivision,
          data.countryName
        ].filter(Boolean);
        
        if (parts.length > 0) {
          setMapAddress(parts.join(', '));
          return;
        }
      }
      
      // Fallback: OpenStreetMap Nominatim
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData && nomData.display_name) {
          setMapAddress(nomData.display_name);
          return;
        }
      }
    } catch (e) {
      console.warn("Reverse geocode handled gracefully:", e);
      setMapAddress(`Koordinat Terpilih (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
    } finally {
      setIsMapLocating(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserGpsCoords({ lat, lon });
          setMapCenter({ lat, lon });
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.display_name || `Lokasi (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            onSelectLocation(addr, lat, lon);
            onClose();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        alert("Gagal mengambil lokasi saat ini: " + err.message);
        setIsLocating(false);
      }
    );
  };

  const handleOpenMapPicker = () => {
    if (selectedCoords) {
      setMapCenter(selectedCoords);
    } else if (initialLat && initialLon) {
      setMapCenter({ lat: initialLat, lon: initialLon });
    } else if (userGpsCoords) {
      setMapCenter(userGpsCoords);
    }
    setShowMapPicker(true);
  };

  const handleConfirmMapLocation = () => {
    const finalAddress = mapAddress || currentAddress || `Koordinat Terpilih (${mapCenter.lat.toFixed(5)}, ${mapCenter.lon.toFixed(5)})`;
    setSelectedCoords(mapCenter);
    onSelectLocation(finalAddress, mapCenter.lat, mapCenter.lon);
    setShowMapPicker(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      {/* MAP PICKER SUB-MODAL */}
      {showMapPicker ? (
        <div className="bg-white w-full max-w-2xl h-[90vh] sm:h-[680px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 relative">
          {/* Header Map */}
          <div className="p-4 bg-white border-b border-outline-variant/30 flex items-center justify-between z-20 shadow-xs">
            <button 
              onClick={() => setShowMapPicker(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1 font-bold text-[13px] text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Kembali</span>
            </button>
            <h3 className="font-bold text-[15px] text-on-surface">Geser Peta Pilih Lokasi Presisi</h3>
            <div className="w-8"></div>
          </div>

          {/* Map Preview Container with Pin in Center */}
          <div className="flex-1 relative bg-slate-100 overflow-hidden">
            {/* Realtime Live Store-to-Customer Distance Overlay Badge & Search */}
            <div className="absolute top-3 left-3 right-16 z-30 space-y-2">
              <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-xl border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[11px] font-bold text-on-surface">Jarak Ke Toko:</span>
                </div>
                {(() => {
                  const liveDist = calculateDistance(storeLat, storeLon, mapCenter.lat, mapCenter.lon);
                  const isFar = liveDist >= maxKm;
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isFar ? 'bg-red-600 text-white animate-pulse' : liveDist > 3.6 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {liveDist.toFixed(1)} km {isFar ? '(🚫 Max 5,0 km)' : liveDist > 3.6 ? '(Ongkir 5k)' : '(Ongkir 2k)'}
                    </span>
                  );
                })()}
              </div>

              {/* In-Map Search Bar */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-lg">
                  <span className="material-symbols-outlined text-[18px] text-primary">search</span>
                  <input 
                    type="text" 
                    placeholder="Cari lokasi di peta..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[12px] font-medium outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-outline-variant/30 max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                    {searchResults.map((res, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          const lat = parseFloat(res.lat);
                          const lon = parseFloat(res.lon);
                          setMapCenter({ lat, lon });
                          setMapAddress(res.display_name);
                          if (mapRef.current) {
                            try { mapRef.current.setView([lat, lon], 16); } catch(e){}
                          }
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="p-3 text-[12px] hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                        <span className="truncate">{res.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Leaflet HD Interactive Canvas Map (Drag & Click Enabled) */}
            <div id="leaflet-interactive-map" className="w-full h-full z-0"></div>

            {/* Center Pin Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none flex flex-col items-center animate-bounce">
              <div className="px-3 py-1 bg-primary text-on-primary font-bold text-[11px] rounded-full shadow-lg border border-white whitespace-nowrap mb-1">
                {pinLabel}
              </div>
              <div className="w-9 h-9 rounded-full bg-red-600 border-4 border-white shadow-2xl flex items-center justify-center text-white font-bold">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-2">
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const lat = pos.coords.latitude;
                      const lon = pos.coords.longitude;
                      setMapCenter({ lat, lon });
                      if (mapRef.current) {
                        try { mapRef.current.setView([lat, lon], 16); } catch(e){}
                      }
                    });
                  }
                }}
                className="w-11 h-11 bg-white rounded-full shadow-xl border border-outline-variant/40 flex items-center justify-center text-primary hover:bg-slate-50 active:scale-95 transition-all"
                title="GPS Ke Lokasi Saya"
              >
                <span className="material-symbols-outlined text-[22px]">my_location</span>
              </button>
            </div>
          </div>

          {/* Bottom Selected Address Sheet */}
          <div className="p-5 bg-white border-t border-outline-variant/30 space-y-4 shadow-lg z-20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[22px]">pin_drop</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Alamat Terpilih dari Peta</span>
                <p className="font-bold text-[13px] text-on-surface leading-snug line-clamp-2 mt-0.5">
                  {isMapLocating ? 'Mendeteksi alamat...' : mapAddress || currentAddress || 'Lokasi Terpilih di Peta'}
                </p>
              </div>
            </div>

            <button 
              onClick={handleConfirmMapLocation}
              className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-2xl text-[14px] hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Konfirmasi Lokasi Ini</span>
            </button>
          </div>
        </div>
      ) : (
        /* MAIN GOJEK/GRAB STYLE SELECTOR MODAL */
        <div className="bg-white w-full max-w-xl h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          {/* Header */}
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-white shrink-0">
            <div className="w-6"></div>
            <h3 className="font-bold text-[16px] text-on-surface">Pilih lokasi</h3>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-6">
            {/* Search Input Box */}
            <div className="relative">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-100/80 rounded-full border border-outline-variant/30 focus-within:border-primary focus-within:bg-white transition-all shadow-2xs">
                <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0 border-2 border-white shadow-xs"></span>
                <input 
                  type="text"
                  placeholder="Cari alamat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] outline-none text-on-surface placeholder:text-on-surface-variant/60"
                />
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden z-50 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        const lat = parseFloat(item.lat);
                        const lon = parseFloat(item.lon);
                        onSelectLocation(item.display_name, lat, lon);
                        onClose();
                      }}
                      className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">location_on</span>
                      <p className="text-[13px] text-on-surface leading-snug line-clamp-2">{item.display_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Buttons (Lokasimu saat ini & Pilih lewat peta) */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="p-3.5 rounded-full border border-outline-variant/60 hover:border-amber-600 hover:bg-amber-50/50 transition-all flex items-center justify-center gap-2 text-[13px] font-bold text-on-surface group shadow-2xs"
              >
                <span className="material-symbols-outlined text-[20px] text-amber-600 group-hover:scale-110 transition-transform">my_location</span>
                <span>{isLocating ? 'Mendeteksi...' : 'Lokasimu saat ini'}</span>
              </button>

              <button 
                onClick={handleOpenMapPicker}
                className="p-3.5 rounded-full border border-outline-variant/60 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 text-[13px] font-bold text-on-surface group shadow-2xs"
              >
                <span className="material-symbols-outlined text-[20px] text-emerald-600 group-hover:scale-110 transition-transform">map</span>
                <span>Pilih lewat peta</span>
              </button>
            </div>

            {/* Alamat Favorit Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-[14px] text-on-surface">Alamat favorit</h4>
                <button className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full hover:bg-emerald-200 transition-colors">
                  Lihat semua
                </button>
              </div>

              {recentAddresses.filter(a => a.isFavorite).map((fav) => (
                <div 
                  key={fav.id}
                  onClick={() => {
                    onSelectLocation(fav.address, fav.lat, fav.lon);
                    onClose();
                  }}
                  className="p-4 rounded-2xl border border-outline-variant/40 bg-white hover:bg-slate-50 cursor-pointer transition-all flex items-start gap-3 shadow-2xs group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-on-surface-variant flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{fav.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h5 className="font-bold text-[14px] text-on-surface">{fav.title}</h5>
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">more_horiz</span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-2">{fav.address}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Alamat Terakhir Section */}
            <div className="space-y-3 pt-2 border-t border-outline-variant/20">
              <h4 className="font-bold text-[14px] text-on-surface">Alamat terakhir</h4>

              <div className="space-y-2">
                {recentAddresses.filter(a => !a.isFavorite).map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      onSelectLocation(item.address, item.lat, item.lon);
                      onClose();
                    }}
                    className="p-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px] shrink-0 mt-0.5">schedule</span>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-[13px] text-on-surface truncate">{item.title}</h5>
                        <p className="text-[11px] text-on-surface-variant truncate">{item.address}</p>
                      </div>
                    </div>
                    <button className="p-1.5 text-on-surface-variant/50 hover:text-primary rounded-full transition-colors ml-2">
                      <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
