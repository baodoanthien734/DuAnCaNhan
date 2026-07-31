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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
      fontFamily: '"Nunito", "Segoe UI", sans-serif',
      paddingTop: '20px', 
      paddingBottom: '20px' 
    }}>
      {/* Main Container */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '45px 40px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px', 
        boxShadow: '0 15px 35px rgba(166, 193, 238, 0.4)' 
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            margin: '0 0 8px 0', 
            color: '#845ec2', 
            fontWeight: '700'
          }}>
            🧶 Trạm Thủ Công
          </h1>
          <p style={{ margin: '0 0 15px 0', color: '#9b89b3', fontSize: '14px' }}>Tạo không gian sáng tạo của bạn ✨</p>

          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '6px',
                  backgroundColor: s <= step ? '#a18cd1' : '#f3e8ff',
                  borderRadius: '3px',
                  transition: 'background-color 0.4s ease'
                }}
              />
            ))}
          </div>
          <p style={{ margin: '10px 0 0 0', color: '#c2a9db', fontSize: '12px', fontWeight: '600' }}>Bước {step}/3</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#fff0f3',
            border: '1px solid #ffc8dd',
            color: '#ff4d6d',
            padding: '12px 15px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🥀 {errorMsg}
          </div>
        )}

        {/* BƯỚC 1: Nhập Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px' }}>
                💌 Địa chỉ Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nhadothucong@gmail.com"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '14px',
                  border: '2px solid #f3e8ff',
                  backgroundColor: '#fbf8ff',
                  borderRadius: '14px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s',
                  outline: 'none',
                  color: '#4a3b52'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d65db1';
                  e.target.style.backgroundColor = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f3e8ff';
                  e.target.style.backgroundColor = '#fbf8ff';
                }}
              />
              <p style={{ fontSize: '12px', color: '#c2a9db', margin: '8px 0 0 0' }}>
                Chúng tôi sẽ gửi một bức thư chứa mã xác nhận đến đây.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 'bold',
                background: loading ? '#d5c4e3' : 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(251, 194, 235, 0.4)',
                opacity: loading ? 0.8 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '🧶 Đang gửi thư...' : '📬 Gửi mã xác nhận'}
            </button>
          </form>
        )}

        {/* BƯỚC 2: Nhập OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ backgroundColor: '#fdf8ff', border: '1px solid #f3e8ff', padding: '15px', borderRadius: '14px', marginBottom: '25px', fontSize: '13px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', color: '#9b89b3' }}>
                ✉️ Thư đã được gửi đến:
              </p>
              <p style={{ margin: '0', fontWeight: 'bold', color: '#845ec2', fontSize: '14px' }}>{email}</p>
              <button
                type="button"
                onClick={handleResetToStep1}
                style={{
                  marginTop: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#d65db1',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px',
                  padding: 0,
                  fontWeight: '600'
                }}
              >
                ← Nhập nhầm hòm thư? Đổi lại
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>
                🎫 Mã xác nhận (6 chữ số)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '28px',
                  border: '2px solid #f3e8ff',
                  backgroundColor: '#fbf8ff',
                  borderRadius: '14px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  letterSpacing: '12px',
                  color: '#845ec2',
                  transition: 'all 0.3s',
                  outline: 'none',
                  fontWeight: 'bold'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d65db1';
                  e.target.style.backgroundColor = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f3e8ff';
                  e.target.style.backgroundColor = '#fbf8ff';
                }}
              />
            </div>

            <div style={{ marginBottom: '25px', textAlign: 'center', padding: '12px 15px', borderRadius: '12px' }}>
              {countdown > 0 ? (
                <p style={{ fontSize: '13px', color: '#9b89b3', margin: 0 }}>
                  ⏱️ Mã sẽ mờ dần sau: <b style={{ color: '#d65db1' }}>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</b>
                </p>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: '#ff4d6d', margin: '0 0 8px 0', fontWeight: '500' }}>🥀 Mã xác nhận đã tan biến!</p>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a18cd1',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      padding: 0,
                      fontWeight: '600',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? '🧶 Đang xin mã mới...' : '✨ Xin cấp mã mới'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || countdown === 0}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 'bold',
                background: loading || countdown === 0 ? '#d5c4e3' : 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                cursor: loading || countdown === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading || countdown === 0 ? 'none' : '0 4px 15px rgba(251, 194, 235, 0.4)',
                opacity: loading || countdown === 0 ? 0.8 : 1
              }}
              onMouseEnter={(e) => !(loading || countdown === 0) && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '🧶 Đang kiểm tra...' : '🌸 Mở khóa hòm thư'}
            </button>
          </form>
        )}

        {/* BƯỚC 3: Nhập Thông tin */}
        {step === 3 && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px' }}>
                👤 Tên gọi thân thương
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bạn muốn chúng mình gọi là gì?"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '14px',
                  border: '2px solid #f3e8ff',
                  backgroundColor: '#fbf8ff',
                  borderRadius: '14px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s',
                  outline: 'none',
                  color: '#4a3b52'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d65db1';
                  e.target.style.backgroundColor = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f3e8ff';
                  e.target.style.backgroundColor = '#fbf8ff';
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px' }}>
                🗝️ Chìa khóa bảo vệ (Mật khẩu)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sáng tạo một mật khẩu thật vững chắc..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    paddingRight: '45px',
                    fontSize: '14px',
                    border: '2px solid #f3e8ff',
                    backgroundColor: '#fbf8ff',
                    borderRadius: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s',
                    outline: 'none',
                    color: '#4a3b52'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d65db1';
                    e.target.style.backgroundColor = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#f3e8ff';
                    e.target.style.backgroundColor = '#fbf8ff';
                  }}
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
                    fontSize: '16px',
                    padding: '5px',
                    color: '#9b89b3'
                  }}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? '🌸' : '💮'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#c2a9db', margin: '8px 0 0 0', lineHeight: '1.4' }}>
                Đan xen chữ hoa, chữ thường, số hoặc ký tự đặc biệt để mũi len được chắc chắn nhất nhé.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 'bold',
                background: loading ? '#d5c4e3' : 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(251, 194, 235, 0.4)',
                opacity: loading ? 0.8 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '🧶 Đang hoàn thiện...' : '✨ Hoàn tất & Bước vào tiệm'}
            </button>
          </form>
        )}

        {/* Footer Links */}
        {step === 1 && (
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', color: '#9b89b3', fontSize: '13px' }}>
              Bạn đã có chìa khóa vào tiệm?
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#fff',
                color: '#d65db1',
                border: '2px dashed #fbc2eb',
                borderRadius: '14px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fdf3f8';
                e.currentTarget.style.borderColor = '#d65db1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#fbc2eb';
              }}
            >
              🎀 Đăng Nhập
            </a>
          </div>
        )}

        {/* Back to Home */}
        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <a
            href="/"
            style={{
              color: '#c2a9db',
              textDecoration: 'none',
              fontSize: '13px',
              transition: 'color 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#845ec2'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#c2a9db'}
          >
            ← Về lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}