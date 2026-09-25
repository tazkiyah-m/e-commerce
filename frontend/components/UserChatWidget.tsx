'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or get chat session ID
  useEffect(() => {
    let sid = localStorage.getItem('ggs_chat_session_v1');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('ggs_chat_session_v1', sid);
    }
    setSessionId(sid);
  }, []);

  const fetchMessages = async () => {
    if (!sessionId) return;
    try {
      const url = `http://localhost:8080/api/chat/messages?session_id=${encodeURIComponent(sessionId)}${user?.id ? `&user_id=${user.id}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Error loading chat:", err);
    }
  };

  const fetchActiveOrder = async () => {
    if (!user?.id) {
      setActiveOrder(null);
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/orders/user?user_id=${user.id}`);
      if (res.ok) {
        const orders = await res.json();
        if (Array.isArray(orders) && orders.length > 0) {
          const latest = orders[0];
          const createdAt = new Date(latest.created_at).getTime();
          const now = Date.now();
          // Only show order if created within the last 2 hours and is still active
          const isRecent = !isNaN(createdAt) && (now - createdAt < 2 * 60 * 60 * 1000);
          const activeStatuses = ['pending', 'paid', 'processing', 'in_delivery'];
          
          if (isRecent && activeStatuses.includes(latest.status?.toLowerCase())) {
            setActiveOrder(latest);
            return;
          }
        }
      }
      setActiveOrder(null);
    } catch (e) {
      console.error("Error loading active order:", e);
      setActiveOrder(null);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    }
    if (user?.id) {
      fetchActiveOrder();
    }
  }, [sessionId, user?.id]);

  // WebSocket Listener
  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket('ws://localhost:8080/api/ws');
    ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
          const data = JSON.parse(event.data);
          if (data.type === 'CHAT_MESSAGE') {
            const newMsg = data.chat_message;
            if (newMsg && (newMsg.session_id === sessionId || (user?.id && newMsg.user_id === user.id))) {
              setMessages(prev => [...prev, newMsg]);
              if (!isOpen && newMsg.sender_role === 'admin') {
                setUnreadCount(prev => prev + 1);
              }
            }
          } else if (data.type === 'NEW_ORDER') {
            fetchActiveOrder();
          }
        }
      } catch (e) {
        // Silently ignore non-JSON frames
      }
    };
    return () => ws.close();
  }, [sessionId, user?.id, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const message = textToSend || inputText;
    if (!message.trim() || !sessionId) return;

    if (!textToSend) setInputText('');

    const payload = {
      session_id: sessionId,
      user_id: user?.id || 0,
      user_name: user?.full_name || 'Pelanggan',
      sender_role: 'user',
      message: message
    };

    try {
      const res = await fetch('http://localhost:8080/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (e) {
      console.error("Error sending chat:", e);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="mb-4 w-96 max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-100px)] bg-white rounded-3xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-primary/90 to-amber-600 p-4 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner border border-white/30 text-lg">
                  🏬
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h4 className="font-bold text-[15px] leading-tight">Live Chat Resto</h4>
                <p className="text-[11px] text-white/80 flex items-center gap-1">
                  <span>● Online</span> — Respon cepat kasir/dapur
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Active Order Preview Card */}
          {activeOrder && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-100/50 border-b border-amber-200/80 p-3 shadow-xs shrink-0 animate-in fade-in">
              <div className="flex items-center gap-3">
                <img 
                  src={activeOrder.items?.[0]?.image_url || '/images/ayam_bakar.png'} 
                  alt="Pesanan" 
                  className="w-12 h-12 rounded-xl object-cover border border-amber-300 shadow-sm shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-[12px] text-amber-950 truncate">
                      Pesanan #{activeOrder.id}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-600 text-white rounded-full text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                      {activeOrder.status === 'paid' ? 'Sedang Diproses 🍳' : activeOrder.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 truncate font-medium">
                    {activeOrder.items?.map((it: any) => `${it.name} x${it.quantity}`).join(', ')}
                  </p>
                </div>
              </div>
              
              {/* Prompt Card */}
              <div className="mt-2.5 pt-2 border-t border-amber-200/70">
                <p className="text-[11px] font-bold text-amber-950 flex items-center gap-1 mb-2">
                  <span className="animate-pulse">✨</span> Apakah ada yang ingin kamu tambahkan, ubah catatan, atau ada kesalahan pada pesanan ini?
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  <button 
                    onClick={() => handleSend(`Halo Admin, untuk pesanan #${activeOrder.id} mohon ditambahkan catatan: `)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-600 hover:text-white text-amber-950 font-bold rounded-lg text-[10px] border border-amber-300 shadow-2xs transition-all"
                  >
                    ✏️ Tambah Catatan
                  </button>
                  <button 
                    onClick={() => handleSend(`Halo Admin, mohon info estimasi waktu pengiriman pesanan #${activeOrder.id} ya 🛵`)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-600 hover:text-white text-amber-950 font-bold rounded-lg text-[10px] border border-amber-300 shadow-2xs transition-all"
                  >
                    🛵 Estimasi Sampai
                  </button>
                  <button 
                    onClick={() => handleSend(`Halo Admin, ada kesalahan/kendala pada pesanan #${activeOrder.id}...`)}
                    className="px-2.5 py-1 bg-white hover:bg-red-600 hover:text-white text-red-700 font-bold rounded-lg text-[10px] border border-red-200 shadow-2xs transition-all"
                  >
                    ⚠️ Ada Kesalahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant p-6 space-y-2">
                <span className="material-symbols-outlined text-4xl text-primary/40">forum</span>
                <p className="font-bold text-[14px]">Ada pertanyaan atau instruksi khusus?</p>
                <p className="text-[12px] opacity-75">Kirim pesan langsung ke kasir/dapur resto kami.</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isAdmin = m.sender_role === 'admin';
                return (
                  <div key={m.id || idx} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                      isAdmin 
                        ? 'bg-white text-on-surface rounded-tl-none border border-outline-variant/30' 
                        : 'bg-primary text-on-primary rounded-tr-none'
                    }`}>
                      {isAdmin && (
                        <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Resto Admin</p>
                      )}
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1 px-1 opacity-70">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="p-3 bg-white border-t border-outline-variant/30 flex items-center gap-2 shrink-0"
          >
            <input 
              type="text" 
              placeholder="Tulis pesan ke resto..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-surface-container-low rounded-full text-[13px] outline-none border border-outline-variant/30 focus:border-primary transition-all"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative group bg-gradient-to-r from-primary via-primary to-amber-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/20"
        title="Chat Resto"
      >
        <span className="material-symbols-outlined text-[24px]">chat</span>
        <span className="hidden group-hover:inline text-[13px] font-bold pr-1">Chat Resto</span>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
