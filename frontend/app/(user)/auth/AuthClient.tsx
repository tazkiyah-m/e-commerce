'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../context/AuthContext';

export default function AuthClient() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/menu';

  const { login: setAuthLogin } = useAuth();

  // Validation
  const validateForm = () => {
    setErrorMsg('');
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMsg('Format email tidak valid.');
      return false;
    }
    if (password.length < 8) {
      setErrorMsg('Kata sandi harus minimal 8 karakter.');
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return false;
    }
    return true;
  };

  const handleAuthSuccess = (token: string, user: any) => {
    setAuthLogin(token, user);
    router.push(redirectTo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { email, password, full_name: fullName, phone_number: phone };

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }

      if (res.ok) {
        handleAuthSuccess(data.token, data.user);
      } else {
        setErrorMsg(data.message || 'Terjadi kesalahan.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:8080/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }

      if (res.ok) {
        handleAuthSuccess(data.token, data.user);
      } else {
        setErrorMsg(data.message || 'Login Google gagal.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-80px)]">
      {/* Toast Notification */}
      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-error text-on-error px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-top-4">
          <span className="material-symbols-outlined">error</span>
          <span className="text-label-md font-bold">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-4 hover:opacity-80">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Left Side: Brand & Visual */}
      <div className="hidden lg:flex w-[45%] relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCi2cHEZnNNTggbpR8wrCrqWaNE2tbFEtZ-cRPaXbHsIZod-qq4lzMZ_hTi7tuqmSkRsXACQ1jlEB9gNphm4h9mbvLk0GGZm60TO4L1wX27XoV7u300NbONqXX1jSgAigsXO-b1Fdr7OrHhnQ2dlpdlRmk5qS4un-bSCXjhD8LiK5iy0bK2f9gFE7HmG6gbxLJNtDCSjTPqYoG3loZfX8IqbIKmWyjMhSR2Nn6f7cmwWNzEejFWmROr')] bg-cover bg-center opacity-40 mix-blend-overlay hover:scale-105 transition-transform duration-1000"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <div className="relative z-10 p-16 text-white w-full h-full flex flex-col justify-end">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-[48px]">restaurant_menu</span>
            <span className="font-headline-md text-[32px] tracking-widest">GGS_WELL</span>
          </div>
          <h2 className="text-[48px] font-bold leading-tight mb-6">
            Temukan <br/>
            Cita Rasa <br/>
            <span className="text-tertiary-fixed-dim">Terbaik.</span>
          </h2>
          <p className="text-body-lg text-white/80 max-w-md">Bergabunglah dengan ribuan pecinta kuliner lainnya dan nikmati kemudahan memesan makanan favorit Anda dalam hitungan detik.</p>
        </div>
      </div>

      {/* Right Side: Auth Forms */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-container-lowest overflow-y-auto">
        <div className="w-full max-w-[480px] my-auto py-8">
          {/* Tab Switcher */}
          <div className="flex gap-8 border-b border-outline-variant mb-12">
            <button 
              className={`pb-4 text-headline-sm font-bold transition-all relative ${isLogin ? 'text-primary' : 'text-on-surface-variant'}`}
              onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            >
              Masuk
              {isLogin && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
            </button>
            <button 
              className={`pb-4 text-headline-sm font-bold transition-all relative ${!isLogin ? 'text-primary' : 'text-on-surface-variant'}`}
              onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            >
              Daftar
              {!isLogin && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
            </button>
          </div>

          <div className="transition-all duration-500">
            <div className="mb-8">
              <h1 className="text-display-sm font-display-sm mb-2">{isLogin ? 'Selamat Datang Kembali' : 'Mulai Petualangan Kuliner'}</h1>
              <p className="text-body-md text-on-surface-variant">
                {isLogin ? 'Silakan masukkan detail akun Anda untuk melanjutkan.' : 'Buat akun untuk mulai memesan makanan favoritmu.'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nama Lengkap</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isLogin}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-body-md"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nomor Telepon</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">call</span>
                      <input 
                        type="tel" 
                        placeholder="081234567890" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required={!isLogin}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-body-md"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="text-label-md font-bold text-on-surface">Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                  <input 
                    type="email" 
                    placeholder="contoh@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-body-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-label-md font-bold text-on-surface">Password</label>
                  {isLogin && <a href="#" className="text-label-sm text-primary font-bold hover:underline">Lupa Password?</a>}
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-surface-container rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-body-md"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Konfirmasi Password</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock_reset</span>
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi kata sandi" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                      className="w-full pl-12 pr-12 py-3.5 bg-surface-container rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-body-md"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center gap-3 pt-2">
                  <input type="checkbox" id="remember" className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary accent-primary"/>
                  <label htmlFor="remember" className="text-label-md text-on-surface-variant cursor-pointer">Ingat saya</label>
                </div>
              )}

              <button 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <>
                    {isLogin ? 'Masuk' : 'Buat Akun'}
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-outline-variant"></div>
              <span className="text-label-sm text-on-surface-variant">Atau lanjutkan dengan</span>
              <div className="flex-1 h-px bg-outline-variant"></div>
            </div>

            <div className="mt-8 flex justify-center">
               <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setErrorMsg('Login dengan Google gagal');
                  }}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  width="100%"
                />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
