'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { setLoginData } from '@/lib/auth';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth.login');
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
      const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
      if (roles.includes('ADMIN')) {
        router.push('/admin');
      } else {
        router.push('/home');
      }
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Gradient pastel mộng mơ
      fontFamily: '"Nunito", "Segoe UI", sans-serif', // Font mềm mại hơn
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <LanguageSwitcher />
      </div>
      {/* Main Container */}
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '45px 40px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Hơi trong suốt nhẹ
        backdropFilter: 'blur(10px)',
        borderRadius: '24px', // Bo góc tròn trịa hơn
        boxShadow: '0 15px 35px rgba(166, 193, 238, 0.4)' 
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            margin: '0 0 8px 0', 
            color: '#845ec2', // Màu tím mộng mơ
            fontWeight: '700'
          }}>
            {t('title')}
          </h1>
          <p style={{ margin: 0, color: '#9b89b3', fontSize: '14px' }}>{t('subtitle')}</p>
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

        {/* Form */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px' }}>
              {t('emailLabel')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
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

          {/* Password Field with Toggle */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#5b4c6e', fontWeight: '600', fontSize: '13px' }}>
              {t('passwordLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
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
                title={showPassword ? t('hidePasswordTitle') : t('showPasswordTitle')}
              >
                {showPassword ? '🌸' : '💮'}
              </button>
            </div>
          </div>

          {/* Login Button */}
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
            {loading ? t('submitLoading') : t('submit')}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '25px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#f3e8ff' }}></div>
          <span style={{ color: '#d5c4e3', fontSize: '11px', letterSpacing: '1px' }}>{t('divider')}</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#f3e8ff' }}></div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', color: '#9b89b3', fontSize: '13px' }}>
            {t('newUser')}
          </p>
          <a
            href="/register"
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
            {t('registerLink')}
          </a>
        </div>

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
            {t('backHome')}
          </a>
        </div>
      </div>
    </div>
  );
}