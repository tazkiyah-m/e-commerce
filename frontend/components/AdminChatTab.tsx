'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdminChatTab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/admin/chat/conversations');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setConversations(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0 && !selectedUser) {
            setSelectedUser(data[0]);
          }
        } catch (e) {
          setConversations([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (sessionId: string, userId?: number) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/chat/messages?session_id=${encodeURIComponent(sessionId)}${userId ? `&user_id=${userId}` : ''}&mark_read=true`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setMessages(Array.isArray(data) ? data : []);
        } catch (e) {
          setMessages([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUser?.session_id) {
      fetchMessages(selectedUser.session_id, selectedUser.user_id);
    }
  }, [selectedUser?.session_id]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/api/ws');
    ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
          const data = JSON.parse(event.data);
          if (data.type === 'CHAT_MESSAGE') {
            const msg = data.chat_message;
            fetchConversations();
            if (selectedUser && msg && (msg.session_id === selectedUser.session_id || (selectedUser.user_id && msg.user_id === selectedUser.user_id))) {
              setMessages(prev => [...prev, msg]);
            }
          }
        }
      } catch (e) {
        // Silently ignore non-JSON frames
      }
    };
    return () => ws.close();
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (customText?: string) => {
    const message = customText || replyText;
    if (!message.trim() || !selectedUser?.session_id) return;

    if (!customText) setReplyText('');

    try {
      const res = await fetch('http://localhost:8080/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedUser.session_id,
          user_id: selectedUser.user_id || 0,
          user_name: 'Resto Admin',
          sender_role: 'admin',
          message: message
        })
      });
      if (res.ok) {
        fetchMessages(selectedUser.session_id, selectedUser.user_id);
        fetchConversations();
      }
    } catch (e) {
      console.error("Failed to send reply:", e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row h-[calc(100vh-180px)] overflow-hidden animate-in fade-in">
      {/* Left List of Conversations */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-outline-variant/30 flex flex-col shrink-0 bg-surface-container-lowest">
        <div className="p-4 border-b border-outline-variant/30 bg-surface flex items-center justify-between">
          <div>
            <h3 className="font-bold text-on-surface text-[16px]">Percakapan Pelanggan</h3>
            <p className="text-[11px] text-on-surface-variant">Pesan & kendala dari pengguna</p>
          </div>
          <button onClick={fetchConversations} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-[13px]">
              Belum ada percakapan dari pelanggan.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = selectedUser?.session_id === c.session_id;
              return (
                <div
                  key={c.session_id}
                  onClick={() => setSelectedUser(c)}
                  className={`p-4 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shrink-0 shadow-sm">
                    {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-[14px] truncate text-on-surface">{c.user_name}</h4>
                      <span className="text-[10px] text-on-surface-variant shrink-0">
                        {c.last_time ? new Date(c.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate">{c.last_message || 'Pesan teks'}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat History & Reply Input */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {selectedUser ? (
          <>
            {/* User Chat Header */}
            <div className="p-4 bg-white border-b border-outline-variant/30 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shadow-sm">
                  {selectedUser.user_name ? selectedUser.user_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-[15px] text-on-surface">{selectedUser.user_name}</h4>
                  <p className="text-[11px] text-on-surface-variant">Sesi ID: {selectedUser.session_id}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-[11px]">
                ● Terhubung
              </span>
            </div>

            {/* Quick Template Chips */}
            <div className="bg-surface-container-low px-4 py-2 border-b border-outline-variant/20 flex gap-2 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => handleSendReply("Pesanan Anda sedang dimasak oleh tim dapur kami 🍳")}
                className="px-3 py-1 bg-white hover:bg-primary/10 hover:text-primary rounded-full text-[11px] font-bold border border-outline-variant/40 shrink-0 transition-colors"
              >
                🍳 Sedang Dimasak
              </button>
              <button 
                onClick={() => handleSendReply("Pesanan Anda sudah SIAP DIAMBIL di toko kak! Silakan menuju kasir toko ya 🛍️🏁")}
                className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 rounded-full text-[11px] font-bold border border-emerald-300 shrink-0 transition-colors"
              >
                🛍️ Siap Ambil di Toko
              </button>
              <button 
                onClick={() => handleSendReply("Kurir 1-satunya kami sedang mengantar pesanan sebelumnya. Pesanan Anda segera diantar berikutnya ya kak, terima kasih atas kesabarannya 🛵🙏")}
                className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-800 hover:text-amber-900 rounded-full text-[11px] font-bold border border-amber-300 shrink-0 transition-colors"
              >
                🛵 Antrean Delivery (1 Kurir)
              </button>
              <button 
                onClick={() => handleSendReply("Baik kak, catatan pesanan Anda sudah kami sampaikan ke tim dapur 👍")}
                className="px-3 py-1 bg-white hover:bg-primary/10 hover:text-primary rounded-full text-[11px] font-bold border border-outline-variant/40 shrink-0 transition-colors"
              >
                👍 Catatan Diperbarui
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-on-surface-variant text-[13px]">Memuat riwayat chat...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant text-[13px]">Belum ada pesan.</div>
              ) : (
                messages.map((m, idx) => {
                  const isAdmin = m.sender_role === 'admin';
                  return (
                    <div key={m.id || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                        isAdmin 
                          ? 'bg-primary text-on-primary rounded-tr-none' 
                          : 'bg-white text-on-surface rounded-tl-none border border-outline-variant/40'
                      }`}>
                        {!isAdmin && (
                          <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">{selectedUser.user_name}</p>
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

            {/* Reply Input Form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendReply(); }} 
              className="p-4 bg-white border-t border-outline-variant/30 flex items-center gap-3"
            >
              <input 
                type="text" 
                placeholder={`Balas pesan ${selectedUser.user_name}...`} 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-5 py-3 bg-surface-container-low rounded-full text-[14px] outline-none border border-outline-variant/30 focus:border-primary transition-all"
              />
              <button 
                type="submit"
                disabled={!replyText.trim()}
                className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold text-[14px] hover:bg-primary/90 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shrink-0 flex items-center gap-2"
              >
                <span>Kirim</span>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-primary/30 mb-2">chat_bubble</span>
            <p className="font-bold text-[16px]">Pilih Pelanggan di Sebelah Kiri</p>
            <p className="text-[13px] opacity-75 mt-1">Pilih salah satu percakapan untuk membalas atau membaca pesan pelanggan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
