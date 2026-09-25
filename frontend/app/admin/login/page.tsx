'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user.role !== 'admin') {
          setError('Akses ditolak. Akun ini bukan admin.');
          return;
        }
        login(data.token, data.user);
        router.push('/admin/dashboard');
      } else {
        const errData = await res.text();
        setError(errData || 'Login gagal. Periksa kembali email dan password Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-container">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/30">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
          </div>
        </div>
        <h1 className="font-display-sm text-headline-sm text-on-surface text-center font-bold mb-2">Admin Portal</h1>
        <p className="text-center text-on-surface-variant mb-8 text-label-md">GGS_WELL Management System</p>
        
        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-label-sm border border-error/20 flex gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Email Admin</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-all text-body-md" 
                placeholder="admin@ggswell.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-all text-body-md" 
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                Verifikasi...
              </>
            ) : (
              <>
                Login ke Dashboard
                <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
