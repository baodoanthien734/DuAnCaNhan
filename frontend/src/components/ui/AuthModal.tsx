'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { setLoginData } from '@/lib/auth';
import { syncGuestCartToServer } from '@/lib/cart-api';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
};

export default function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
  const router = useRouter();
  const tLogin = useTranslations('auth.login');
  const tReg = useTranslations('auth.register');

  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // --- STATE LOGIN ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // --- STATE REGISTER ---
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [isOpen, initialView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStep = localStorage.getItem('reg_step');
    const savedEmail = localStorage.getItem('reg_email');
    const savedExpiresAt = localStorage.getItem('reg_expiresAt');
    const savedOtp = localStorage.getItem('reg_otp');

    if (savedStep && savedEmail && savedExpiresAt) {
      const expireTime = parseInt(savedExpiresAt, 10);
      if (expireTime > Date.now()) {
        setRegStep(parseInt(savedStep, 10) as 1 | 2 | 3);
        setRegEmail(savedEmail);
        setExpiresAt(expireTime);
        if (savedOtp) setRegOtp(savedOtp);
        setView('register');
      } else {
        clearRegisterStorage();
      }
    }
  }, []);

  const clearRegisterStorage = () => {
    localStorage.removeItem('reg_step');
    localStorage.removeItem('reg_email');
    localStorage.removeItem('reg_expiresAt');
    localStorage.removeItem('reg_otp');
  };

  useEffect(() => {
    if (view !== 'register' || regStep !== 2 || !expiresAt) return;
    const updateCountdown = () => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setCountdown(diffInSeconds);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [view, regStep, expiresAt]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.post('/auth/login', { email: loginEmail, password: loginPassword });
      const { accessToken, refreshToken, user } = response.data;
      setLoginData({ accessToken, refreshToken, user });
      try {
        await syncGuestCartToServer();
      } catch {
        // Ignore merge errors to avoid blocking successful login.
      }
      onClose();
      // Luôn ở lại trang hiện tại bất kể là ai
      window.location.reload(); 
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Email hoặc mật khẩu không chính xác'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.post('/auth/send-otp', { email: regEmail });
      const expireTime = response.data?.expiresAt ? new Date(response.data.expiresAt).getTime() : Date.now() + 5 * 60 * 1000;
      localStorage.setItem('reg_step', '2');
      localStorage.setItem('reg_email', regEmail);
      localStorage.setItem('reg_expiresAt', expireTime.toString());
      setExpiresAt(expireTime);
      setRegOtp('');
      setRegStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/verify-otp', { email: regEmail, code: regOtp });
      localStorage.setItem('reg_otp', regOtp);
      localStorage.setItem('reg_step', '3');
      setRegStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const currentOtp = regOtp || localStorage.getItem('reg_otp') || '';
      
      // 1. Đăng ký tài khoản
      await apiClient.post('/auth/register', { 
        email: regEmail, 
        code: currentOtp, 
        name: regName, 
        password: regPassword 
      });
      clearRegisterStorage();
      
      // 2. Tự động Đăng nhập ngay lập tức bằng thông tin vừa tạo
      const loginResponse = await apiClient.post('/auth/login', { 
        email: regEmail, 
        password: regPassword 
      });
      const { accessToken, refreshToken, user } = loginResponse.data;
      setLoginData({ accessToken, refreshToken, user });
      try {
        await syncGuestCartToServer();
      } catch {
        // Ignore merge errors to avoid blocking successful registration flow.
      }
      
      onClose();
      // Tải lại trang để cập nhật Header
      window.location.reload(); 
      
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      setLoading(false); // Chỉ tắt loading khi lỗi
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()} 
      >
        <button onClick={onClose} className="absolute right-5 top-5 text-slate-400 hover:text-slate-900 transition">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {errorMsg && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* --- VIEW LOGIN --- */}
        {view === 'login' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">{tLogin('title')}</h2>
              <p className="mt-2 text-sm text-slate-500">{tLogin('subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tLogin('emailLabel')}</label>
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder={tLogin('emailPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tLogin('passwordLabel')}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={tLogin('passwordPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                {loading ? tLogin('submitLoading') : tLogin('submit')}
              </button>
            </form>

            <div className="my-6 flex items-center justify-center gap-4 text-sm text-slate-400">
              <div className="h-px flex-1 bg-slate-100"></div>
              {tLogin('divider')}
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="text-center">
              <span className="text-sm text-slate-500">{tLogin('newUser')} </span>
              <button onClick={() => setView('register')} className="text-sm font-semibold text-slate-900 underline hover:text-slate-700">
                {tLogin('registerLink')}
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW REGISTER --- */}
        {view === 'register' && (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900">{tReg('title')}</h2>
              <p className="mt-2 text-sm text-slate-500">{tReg('subtitle')}</p>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${s <= regStep ? 'bg-slate-900' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>

            {regStep === 1 && (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{tReg('step1.emailLabel')}</label>
                  <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={tReg('step1.emailPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                </div>
                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tReg('step1.submitLoading') : tReg('step1.submit')}
                </button>
              </form>
            )}

            {regStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">{tReg('step2.emailSent')}</p>
                  <p className="font-semibold text-slate-900 mt-1">{regEmail}</p>
                  <button type="button" onClick={() => { clearRegisterStorage(); setRegStep(1); }} className="mt-2 text-xs text-slate-500 underline hover:text-slate-900">
                    {tReg('step2.changeEmail')}
                  </button>
                </div>
                <input type="text" required maxLength={6} value={regOtp} onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                <button type="submit" disabled={loading || countdown === 0} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tReg('step2.submitLoading') : tReg('step2.submit')}
                </button>
              </form>
            )}

            {regStep === 3 && (
              <form onSubmit={handleRegisterFinal} className="flex flex-col gap-4">
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder={tReg('step3.namePlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                <input type={showPassword ? 'text' : 'password'} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={tReg('step3.passwordPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tReg('step3.submitLoading') : tReg('step3.submit')}
                </button>
              </form>
            )}

            {regStep === 1 && (
              <div className="mt-6 text-center">
                <span className="text-sm text-slate-500">{tReg('footer.haveAccount')} </span>
                <button onClick={() => setView('login')} className="text-sm font-semibold text-slate-900 underline hover:text-slate-700">
                  {tReg('footer.loginLink')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}