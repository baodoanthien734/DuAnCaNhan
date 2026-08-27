/**
 * @fileoverview Modal xác thực - Login/Register với OTP flow
 * 
 * Chức năng chính:
 * - Login form (email + password)
 * - Register flow (email → OTP → password + name)
 * - Switch giữa Login và Register
 * - Error handling với translations
 * 
 * Flow:
 * 1. User click "Đăng nhập" → Open modal
 * 2. Choose Login hoặc Register
 * 3. Register: Enter email → Send OTP → Enter OTP → Create password
 * 4. Login: Enter email + password → Login success → Set auth data
 * 
 * Props:
 * - isOpen: Boolean modal đang mở
 * - onClose: Function để đóng modal
 * - onSuccess: Callback sau khi login/register thành công
 */
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { setLoginData } from '@/lib/auth';
import { syncGuestCartToServer } from '@/lib/cart-api';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register' | 'forgot-password';
};

// Hàm hỗ trợ format số giây thành MM:SS
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
  const router = useRouter();
  const tLogin = useTranslations('auth.login');
  const tReg = useTranslations('auth.register');
  const tFp = useTranslations('auth.forgot_password'); 

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'login' | 'register' | 'forgot-password'>(initialView);
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

  // --- STATE FORGOT PASSWORD ---
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpExpiresAt, setFpExpiresAt] = useState<number | null>(null);
  const [fpCountdown, setFpCountdown] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg('');
      setShowPassword(false);
      if (initialView === 'forgot-password') setFpStep(1);
      if (initialView === 'register') setRegStep(1);
    }
  }, [isOpen, initialView]);

  // Countdown cho Register OTP
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

  // Countdown cho Forgot Password OTP
  useEffect(() => {
    if (view !== 'forgot-password' || fpStep !== 2 || !fpExpiresAt) return;
    const updateCountdown = () => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((fpExpiresAt - now) / 1000));
      setFpCountdown(diffInSeconds);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [view, fpStep, fpExpiresAt]);

  const clearRegisterStorage = () => {
    localStorage.removeItem('reg_step');
    localStorage.removeItem('reg_email');
    localStorage.removeItem('reg_expiresAt');
    localStorage.removeItem('reg_otp');
  };

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
      } catch {}
      onClose();
      window.location.reload(); 
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Email hoặc mật khẩu không chính xác'));
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC REGISTER ---
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.post('/auth/send-otp', { email: regEmail });
      const expireTime = response.data?.expiresAt ? new Date(response.data.expiresAt).getTime() : Date.now() + 5 * 60 * 1000;
      setExpiresAt(expireTime);
      setRegOtp('');
      setRegStep(2);
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Có lỗi xảy ra khi gửi OTP'));
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
      setRegStep(3);
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/register', { 
        email: regEmail, 
        code: regOtp, 
        name: regName, 
        password: regPassword 
      });
      clearRegisterStorage();
      
      const loginResponse = await apiClient.post('/auth/login', { 
        email: regEmail, 
        password: regPassword 
      });
      const { accessToken, refreshToken, user } = loginResponse.data;
      setLoginData({ accessToken, refreshToken, user });
      try {
        await syncGuestCartToServer();
      } catch {}
      
      onClose();
      window.location.reload(); 
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message.join(', ') : (resData?.message || 'Đăng ký thất bại.'));
    } finally {
      setLoading(false); 
    }
  };

  // --- LOGIC FORGOT PASSWORD ---
  const handleFpSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.post('/auth/forgot-password/send-otp', { email: fpEmail });
      const expireTime = response.data?.expiresAt ? new Date(response.data.expiresAt).getTime() : Date.now() + 5 * 60 * 1000;
      setFpExpiresAt(expireTime);
      setFpOtp('');
      setFpStep(2);
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Email không tồn tại'));
    } finally {
      setLoading(false);
    }
  };

  const handleFpVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/forgot-password/verify-otp', { email: fpEmail, code: fpOtp });
      setFpStep(3);
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message[0] : (resData?.message || 'Mã OTP không hợp lệ'));
    } finally {
      setLoading(false);
    }
  };

  const handleFpResetFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/forgot-password/reset', {
        email: fpEmail,
        code: fpOtp,
        newPassword: fpNewPassword,
      });
      setView('login');
      setLoginEmail(fpEmail);
      setErrorMsg('');
    } catch (err: any) {
      const resData = err.response?.data;
      setErrorMsg(Array.isArray(resData?.message) ? resData.message.join(', ') : (resData?.message || 'Đặt lại mật khẩu thất bại'));
    } finally {
      setLoading(false);
    }
  };

if (!isOpen || !mounted) return null;

  // GOM NÚT GOOGLE VÀO MỘT BIẾN ĐỂ TÁI SỬ DỤNG CHO ĐẸP CODE
  const renderGoogleButton = () => (
    <a 
      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      {tLogin('googleLogin')}
    </a>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
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
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 whitespace-pre-wrap">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">{tLogin('passwordLabel')}</label>
                  <button type="button" onClick={() => setView('forgot-password')} className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline">
                    {tLogin('forgotPasswordLink') || 'Quên mật khẩu?'}
                  </button>
                </div>
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

            {/* ĐẶT NÚT GOOGLE Ở DƯỚI  */}
            {renderGoogleButton()}

            <div className="mb-5 text-center">
              <span className="text-sm text-slate-500">{tLogin('newUser')} </span>
              <button onClick={() => setView('register')} className="text-sm font-semibold text-slate-900 underline hover:text-slate-700">
                {tLogin('registerLink')}
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW FORGOT PASSWORD --- */}
        {view === 'forgot-password' && (
          <div>
             {/* Giữ nguyên như cũ... */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900">{tFp('title')}</h2>
              <p className="mt-2 text-sm text-slate-500">{tFp('subtitle')}</p>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${s <= fpStep ? 'bg-slate-900' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>

            {fpStep === 1 && (
              <form onSubmit={handleFpSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{tFp('step1.emailLabel')}</label>
                  <input type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder={tFp('step1.emailPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                </div>
                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tFp('step1.submitLoading') : tFp('step1.submit')}
                </button>
              </form>
            )}

            {fpStep === 2 && (
              <form onSubmit={handleFpVerifyOtp} className="flex flex-col gap-4">
                <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">{tFp('step2.emailSent')}</p>
                  <p className="font-semibold text-slate-900 mt-1">{fpEmail}</p>
                  <button type="button" onClick={() => setFpStep(1)} className="mt-2 text-xs text-slate-500 underline hover:text-slate-900">
                    {tFp('step2.changeEmail')}
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <input type="text" required maxLength={6} value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                  
                  <div className="flex justify-between items-center px-1 text-[13px]">
                    {fpCountdown > 0 ? (
                      <span className="text-slate-500">
                        {tFp('step2.expireIn')} <strong className="text-slate-800">{formatTime(fpCountdown)}</strong>
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">{tFp('step2.expired')}</span>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => handleFpSendOtp()}
                      disabled={fpCountdown > 0 || loading}
                      className="font-semibold text-slate-900 underline hover:text-slate-600 disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed transition"
                    >
                      {loading && fpCountdown === 0 ? tFp('step2.resendOtpLoading') : tFp('step2.resendOtp')}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading || fpCountdown === 0} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tFp('step2.submitLoading') : tFp('step2.submit')}
                </button>
              </form>
            )}

            {fpStep === 3 && (
              <form onSubmit={handleFpResetFinal} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{tFp('step3.passwordLabel')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required value={fpNewPassword} onChange={(e) => setFpNewPassword(e.target.value)} placeholder={tFp('step3.passwordPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tFp('step3.submitLoading') : tFp('step3.submit')}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button onClick={() => setView('login')} className="text-sm font-semibold text-slate-900 underline hover:text-slate-700">
                {tFp('backToLogin')}
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
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">{tReg('step2.emailSent')}</p>
                  <p className="font-semibold text-slate-900 mt-1">{regEmail}</p>
                  <button type="button" onClick={() => { clearRegisterStorage(); setRegStep(1); }} className="mt-2 text-xs text-slate-500 underline hover:text-slate-900">
                    {tReg('step2.changeEmail')}
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <input type="text" required maxLength={6} value={regOtp} onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                  
                  <div className="flex justify-between items-center px-1 text-[13px]">
                    {countdown > 0 ? (
                      <span className="text-slate-500">
                        {tReg('step2.expireIn')} <strong className="text-slate-800">{formatTime(countdown)}</strong>
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">{tReg('step2.expired')}</span>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={countdown > 0 || loading}
                      className="font-semibold text-slate-900 underline hover:text-slate-600 disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed transition"
                    >
                      {loading && countdown === 0 ? tReg('step2.resendOtpLoading') : tReg('step2.resendOtp')}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading || countdown === 0} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tReg('step2.submitLoading') : tReg('step2.submit')}
                </button>
              </form>
            )}

            {regStep === 3 && (
              <form onSubmit={handleRegisterFinal} className="flex flex-col gap-4">
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder={tReg('step3.namePlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={tReg('step3.passwordPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">
                  {loading ? tReg('step3.submitLoading') : tReg('step3.submit')}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">{tReg('footer.haveAccount')} </span>
              <button onClick={() => setView('login')} className="text-sm font-semibold text-slate-900 underline hover:text-slate-700">
                {tReg('footer.loginLink')}
              </button>
            </div>

            {/* THÊM DIVIDER VÀ NÚT GOOGLE */}
            <div className="my-6 flex items-center justify-center gap-4 text-sm text-slate-400">
              <div className="h-px flex-1 bg-slate-100"></div>
              Or
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            {renderGoogleButton()}
          </div>
        )}
      </div>
    </div>,
    document.body 
  );
}