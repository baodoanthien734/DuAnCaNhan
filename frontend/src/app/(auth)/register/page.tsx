'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // 1. Khôi phục State từ localStorage khi mount trang
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedStep = localStorage.getItem('reg_step');
    const savedEmail = localStorage.getItem('reg_email');
    const savedExpiresAt = localStorage.getItem('reg_expiresAt');
    const savedOtp = localStorage.getItem('reg_otp'); // 💾 Lưu tạm OTP đã verify

    if (localStorage.getItem('user_info')) {
      // If user_info exists (possibly stale), verify session with backend before redirecting
      (async () => {
        try {
          await apiClient.get('/auth/me');
          clearRegisterStorage();
          router.push('/home');
        } catch (e) {
          // token invalid or expired — clear stale localStorage and stay on register
          localStorage.removeItem('user_info');
        }
      })();
      return;
    }

    if (savedStep && savedEmail && savedExpiresAt) {
      const expireTime = parseInt(savedExpiresAt, 10);
      if (expireTime > Date.now()) {
        setStep(parseInt(savedStep, 10) as 1 | 2 | 3);
        setEmail(savedEmail);
        setExpiresAt(expireTime);
        if (savedOtp) setOtpCode(savedOtp);
      } else {
        clearRegisterStorage();
      }
    }
  }, []);

  // 🔄 2. LẮNG NGHE SỰ KIỆN THAY ĐỔI STORAGE TỪ CÁC TAB KHÁC (Cross-Tab Sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // Khi tab khác cập nhật reg_step
      if (e.key === 'reg_step' && e.newValue) {
        setStep(parseInt(e.newValue, 10) as 1 | 2 | 3);
      }
      // Khi tab khác cập nhật email
      if (e.key === 'reg_email' && e.newValue) {
        setEmail(e.newValue);
      }
      // Khi tab khác dọn dẹp storage (hoàn tất đăng ký)
      if (e.key === null || e.key === 'reg_step' && !e.newValue) {
        setStep(1);
        setEmail('');
        setOtpCode('');
        setExpiresAt(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 1.a. Nếu login ở tab khác, chuyển sang /home ngay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAuthRedirect = () => {
      if (localStorage.getItem('user_info')) {
        clearRegisterStorage();
        router.push('/home');
      }
    };

    const handleAuthChange = (e: StorageEvent) => {
      if (e.key === 'user_info' && e.newValue) {
        handleAuthRedirect();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleAuthRedirect();
      }
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('focus', handleAuthRedirect);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('focus', handleAuthRedirect);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router]);

  // Hàm hỗ trợ dọn dẹp gọn gàng
  const clearRegisterStorage = () => {
    localStorage.removeItem('reg_step');
    localStorage.removeItem('reg_email');
    localStorage.removeItem('reg_expiresAt');
    localStorage.removeItem('reg_otp');
  };

  // ⏱️ 3. Effect tính đếm ngược
  useEffect(() => {
    if (step !== 2 || !expiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setCountdown(diffInSeconds);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [step, expiresAt]);

  // Step 1: Gửi OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiClient.post('/auth/send-otp', { email });
      const expireTime = response.data?.expiresAt 
        ? new Date(response.data.expiresAt).getTime() 
        : Date.now() + 5 * 60 * 1000;

      localStorage.setItem('reg_step', '2');
      localStorage.setItem('reg_email', email);
      localStorage.setItem('reg_expiresAt', expireTime.toString());

      setExpiresAt(expireTime);
      setOtpCode('');
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Xác thực OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await apiClient.post('/auth/verify-otp', { email, code: otpCode });
      
      // Lưu lại OTP đã verify vào localStorage để tab khác hoặc reload không bị mất mã
      localStorage.setItem('reg_otp', otpCode);
      localStorage.setItem('reg_step', '3');
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Đăng ký tài khoản
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Lấy OTP từ state hoặc fallback từ localStorage
      const currentOtp = otpCode || localStorage.getItem('reg_otp') || '';

      await apiClient.post('/auth/register', {
        email,
        code: currentOtp,
        name,
        password,
      });

      clearRegisterStorage();
      alert('Đăng ký thành công! Hãy đăng nhập ngay.');
      router.push('/login');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToStep1 = () => {
    clearRegisterStorage();
    setStep(1);
    setExpiresAt(null);
    setOtpCode('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif', paddingTop: '20px', paddingBottom: '20px' }}>
      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '450px', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 40px rgba(102, 126, 234, 0.15)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📚 LightNovel Hub
          </h1>
          <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>Tạo tài khoản của bạn</p>

          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: s <= step ? '#667eea' : '#e0e0e0',
                  borderRadius: '2px',
                  transition: 'background-color 0.3s'
                }}
              />
            ))}
          </div>
          <p style={{ margin: '10px 0 0 0', color: '#999', fontSize: '12px' }}>Bước {step}/3</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '12px 15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ❌ {errorMsg}
          </div>
        )}

        {/* BƯỚC 1: Nhập Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                📧 Địa chỉ Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0 0 0' }}>
                Chúng tôi sẽ gửi mã xác thực OTP đến email này
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: loading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
                opacity: loading ? 0.8 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '⏳ Đang gửi...' : '📬 Gửi mã OTP'}
            </button>
          </form>
        )}

        {/* BƯỚC 2: Nhập OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ backgroundColor: '#f9f3ff', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#333' }}>
                ✉️ Mã OTP đã được gửi đến:
              </p>
              <p style={{ margin: '0', fontWeight: '600', color: '#667eea' }}>{email}</p>
              <button
                type="button"
                onClick={handleResetToStep1}
                style={{
                  marginTop: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#764ba2',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px',
                  padding: 0
                }}
              >
                ← Đổi email
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                🔐 Mã OTP (6 chữ số)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '24px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div style={{ marginBottom: '20px', textAlign: 'center', padding: '12px 15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              {countdown > 0 ? (
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  ⏱️ Mã OTP hết hạn sau: <b style={{ color: '#667eea' }}>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</b>
                </p>
              ) : (
                <div>
                  <p style={{ fontSize: '14px', color: '#c33', margin: '0 0 8px 0' }}>⚠️ Mã OTP đã hết hạn!</p>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#667eea',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      padding: 0,
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? '⏳ Đang gửi lại...' : '🔄 Gửi lại mã OTP'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || countdown === 0}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: loading || countdown === 0 ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || countdown === 0 ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
                opacity: loading || countdown === 0 ? 0.8 : 1
              }}
              onMouseEnter={(e) => !(loading || countdown === 0) && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '⏳ Đang xác thực...' : '✅ Xác thực OTP'}
            </button>
          </form>
        )}

        {/* BƯỚC 3: Nhập Thông tin */}
        {step === 3 && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                👤 Họ và Tên
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ tên của bạn"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                🔐 Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mạnh"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    paddingRight: '45px',
                    fontSize: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '5px'
                  }}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0 0 0' }}>
                Yêu cầu: Chữ hoa, chữ thường, số hoặc ký tự đặc biệt
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: loading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
                opacity: loading ? 0.8 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '⏳ Đang xử lý...' : '🎉 Hoàn tất Đăng ký'}
            </button>
          </form>
        )}

        {/* Footer Links */}
        {step === 1 && (
          <div style={{ marginTop: '25px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
              Đã có tài khoản?
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: '#f0f0f0',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#667eea';
              }}
            >
              🔓 Đăng Nhập
            </a>
          </div>
        )}

        {/* Back to Home */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a
            href="/"
            style={{
              color: '#999',
              textDecoration: 'none',
              fontSize: '12px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          >
            ← Quay lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}