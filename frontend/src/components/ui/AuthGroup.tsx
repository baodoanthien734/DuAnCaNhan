'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link'; // Import Link
import AuthModal from '@/components/ui/AuthModal';
import CartDrawer from '@/components/ui/CartDrawer';
import { logout } from '@/lib/auth';

type User = {
  id: number;
  email: string;
  name?: string;
  roles: string[];
};

export default function AuthGroup() {
  const t = useTranslations('public_pages');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialView, setInitialView] = useState<'login' | 'register'>('login');
  
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (error) {
        console.error('Lỗi khi đọc thông tin user', error);
      }
    }
  }, []);

  const openLogin = () => {
    setInitialView('login');
    setIsModalOpen(true);
  };

  const openRegister = () => {
    setInitialView('register');
    setIsModalOpen(true);
  };

  const handleRequireLoginFromCart = () => {
    setIsCartOpen(false);
    setInitialView('login');
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    setUser(null);
    await logout();
  };

  if (!isClient) {
    return <div style={{ width: '150px' }}></div>;
  }

  // === NẾU ĐÃ ĐĂNG NHẬP ===
  if (user) {
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* 🛒 Nút mở giỏ hàng */}
        <button 
          onClick={() => setIsCartOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            borderRadius: '999px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px'
          }}
        >
          🛒 Giỏ hàng
        </button>

        <Link
          href="/profile"
          style={{
            padding: '8px 16px',
            backgroundColor: '#eef2ff',
            color: '#3730a3',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
            border: '1px solid #c7d2fe',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e7ff')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eef2ff')}
        >
          {t('header.profile')}
        </Link>

        {/* Nút vào trang Admin (Chỉ hiện nếu là ADMIN) */}
        {isAdmin && (
          <Link 
            href="/admin"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            {t('header.adminPanel')}
          </Link>
        )}

        {/* Khu vực Avatar và Tên */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isAdmin ? '#0f172a' : '#f3f4f6', // Admin avatar đen cho ngầu
            color: isAdmin ? '#fff' : '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            border: isAdmin ? 'none' : '1px solid #e5e7eb'
          }}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {user.name || user.email.split('@')[0]}
            </span>
          </div>
        </div>

        {/* Nút Đăng xuất */}
        <button 
          onClick={handleLogout}
          style={{
            fontSize: '13px',
            color: '#ef4444', // Màu đỏ nhẹ cho dễ thấy
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {t('header.logout')}
        </button>

        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </div>
    );
  }

  // === NẾU CHƯA ĐĂNG NHẬP ===
  return (
    <>
      <button
        onClick={() => setIsCartOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          backgroundColor: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a',
          borderRadius: '999px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        🛒 Giỏ hàng
      </button>

      <button 
        onClick={openLogin} 
        style={{ color: '#111827', padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', fontFamily: 'inherit', fontWeight: '500' }}
      >
        {t('header.login')}
      </button>
      <button 
        onClick={openRegister} 
        style={{ backgroundColor: '#111827', color: '#fff', padding: '10px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '16px', fontFamily: 'inherit', fontWeight: '500' }}
      >
        {t('header.register')}
      </button>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRequireLogin={handleRequireLoginFromCart}
      />
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialView={initialView} />
    </>
  );
}