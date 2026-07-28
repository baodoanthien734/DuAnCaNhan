'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setLoginData } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
      setLoginData({ accessToken, refreshToken, user });
      router.push('/home');
    } catch (err: any) {
      const resData = err.response?.data;

      if (Array.isArray(resData?.message)) {
        // Nếu là lỗi Validation từ DTO (Trả về Mảng) -> Lấy câu lỗi đầu tiên
        setErrorMsg(resData.message[0]);
      } else if (typeof resData?.message === 'string') {
        // Nếu là lỗi Exception từ AuthService (Trả về String)
        setErrorMsg(resData.message);
      } else {
        // Fallback lỗi mặc định
        setErrorMsg('Email hoặc mật khẩu không chính xác');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>
      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '450px', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 40px rgba(102, 126, 234, 0.15)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📚 LightNovel Hub
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Đăng nhập tài khoản của bạn</p>
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

        {/* Form */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
              📧 Email
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
          </div>

          {/* Password Field with Toggle */}
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
                placeholder="Nhập mật khẩu của bạn"
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
          </div>

          {/* Login Button */}
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
            {loading ? '⏳ Đang xác thực...' : '🚀 Đăng Nhập'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
          <span style={{ color: '#999', fontSize: '12px' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
            Chưa có tài khoản?
          </p>
          <a
            href="/register"
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
            📝 Đăng Ký Ngay
          </a>
        </div>

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