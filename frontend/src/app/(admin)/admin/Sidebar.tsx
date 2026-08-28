'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { logout } from '@/lib/auth';
import { resolveImageUrl } from '@/lib/utils';

type SidebarProps = {
  user: { name?: string; email?: string; image?: string | null };
  brand?: string;
  title?: string;
};

export default function Sidebar({ user, brand, title }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [clientUser, setClientUser] = useState(user);

  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin_sidebar');
  
  const popupRef = useRef<HTMLDivElement>(null);

  // LOGIC ĐỒNG BỘ DỮ LIỆU TỪ LOCALSTORAGE
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setClientUser({
          name: parsedUser.name || user.name,
          email: parsedUser.email || user.email,
          image: parsedUser.image !== undefined ? parsedUser.image : user.image
        });
      } catch (error) {
        // Bỏ qua nếu lỗi parse JSON
      }
    }
  }, [user]);

  // LOGIC ĐỔI NGÔN NGỮ ĐƠN GIẢN: Cập nhật Cookie, xử lý URL, refresh trang
  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    
    // 1. Cập nhật Cookie (Rất quan trọng để next-intl nhận diện trên Server)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // 2. Xử lý đường dẫn thông minh
    const segments = pathname.split('/');
    if (segments[1] === locale) {
      // Nếu URL đang có dạng /vi/admin -> đổi thành /en/admin
      segments[1] = newLocale;
    } else {
      // Nếu URL không có ngôn ngữ (ví dụ /admin) -> chèn vào thành /en/admin
      segments.splice(1, 0, newLocale);
    }
    
    const newPath = segments.join('/') || '/';
    
    // 3. Chuyển trang và bắt buộc Server render lại để lấy data ngôn ngữ mới
    router.push(newPath);
    router.refresh(); 
    setShowSettings(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  const navItems = [
    { label: t('nav.dashboard'), href: '/admin', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { label: t('nav.categories'), href: '/admin/categories', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { label: t('nav.products'), href: '/admin/products', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { label: t('nav.posts'), href: '/admin/posts', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
    { label: t('nav.orders'), href: '/admin/orders', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { label: t('nav.reviews'), href: '/admin/reviews', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    { label: t('nav.customers'), href: '/admin/customers', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        minWidth: collapsed ? '80px' : '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        backgroundColor: '#4592b6', 
        borderRight: '1px solid #29617a',
        zIndex: 30,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '24px 14px',
        overflow: showSettings ? 'visible' : 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#ffffff',
      }}
    >
      {/* Header Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', width: '100%' }}>
        
        {/* LOGO, BRAND NAME & NÚT TOGGLE ĐƯỢC GOM CHUNG */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between', 
          flexDirection: collapsed ? 'column' : 'row',
          width: '100%',
          gap: collapsed ? '16px' : '0',
          marginBottom: '20px' 
        }}>
          
          {/* Logo & Tên */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: collapsed ? '24px' : '20px' }}>🍃</span>
            {!collapsed && (
              <h1 style={{ 
                margin: 0, 
                color: '#ffffff', 
                fontSize: '22px', 
                fontWeight: '800', 
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap'
              }}>
                {brand ?? t('brand')}
              </h1>
            )}
          </div>

          {/* Nút Toggle nằm hẳn bên trong */}
          <button
            type="button"
            onClick={() => {
              setCollapsed(!collapsed);
              setShowSettings(false);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)', // Đổi màu để hòa hợp với nền xanh
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff', 
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            )}
          </button>
        </div>

        {/* AVATAR KHU VỰC ADMIN */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          width: '100%',
          padding: collapsed ? '0' : '10px',
          backgroundColor: collapsed ? 'transparent' : 'rgba(255,255,255,0.1)', 
          borderRadius: '12px',
          transition: 'all 0.3s ease'
        }}>
          {/* Vòng tròn Avatar */}
          <div style={{ 
            flexShrink: 0,
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            backgroundColor: '#ffffff', 
            color: '#4592b6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold', 
            fontSize: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {clientUser.image ? (
              <img 
                src={resolveImageUrl(clientUser.image)} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              (clientUser.name || clientUser.email || 'A').charAt(0).toUpperCase()
            )}
          </div>
          
          {/* Tên Admin và Chức vụ */}
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ 
                color: '#ffffff', 
                fontSize: '14px', 
                fontWeight: '700', 
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>
                {clientUser.name || clientUser.email?.split('@')[0] || 'Admin'}
              </span>
              <span style={{ color: '#bae6fd', fontSize: '11px', fontWeight: '500' }}>
                Administrator
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Danh sách Menu Chính */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                textDecoration: 'none',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#4592b6' : '#f0f9ff', 
                fontWeight: isActive ? '700' : '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ flexShrink: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Sidebar: Nút Cài Đặt (Pop-up) */}
      <div style={{ position: 'relative', marginTop: '16px' }} ref={popupRef}>
        
        {/* HỘP POP-UP SETTINGS */}
        {showSettings && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: collapsed ? '60px' : '0',
              width: '230px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '8px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              color: '#334155',
            }}
          >
            {/* 1. Về Cửa Hàng */}
            <Link
              href="/"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                textDecoration: 'none', color: '#334155', fontSize: '14px', fontWeight: '500', transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span>{t('nav.store')}</span>
            </Link>

            {/* 2. Ngôn ngữ */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px',
              color: '#334155', fontSize: '14px', fontWeight: '500'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{t('nav.language')}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '4px 6px', borderRadius: '8px' }}>
                <button 
                  onClick={() => handleLanguageChange('vi')}
                  style={{ background: locale === 'vi' ? '#ffffff' : 'transparent', border: 'none', color: locale === 'vi' ? '#4592b6' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', boxShadow: locale === 'vi' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                >
                  VI
                </button>
                <button 
                  onClick={() => handleLanguageChange('en')}
                  style={{ background: locale === 'en' ? '#ffffff' : 'transparent', border: 'none', color: locale === 'en' ? '#4592b6' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', boxShadow: locale === 'en' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                >
                  EN
                </button>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />

            {/* 3. Đăng Xuất */}
            <button
              onClick={async () => {
                setShowSettings(false); 
                await logout(); 
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                border: 'none', backgroundColor: 'transparent', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}

        {/* NÚT SETTINGS CHÍNH */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          title={collapsed ? t('nav.settings') : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: showSettings ? '#0284c7' : 'transparent', 
            color: showSettings ? '#ffffff' : '#f0f9ff',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: 'inherit',
            fontFamily: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {!collapsed && <span>{t('nav.settings')}</span>}
          </div>
        </button>
      </div>
    </aside>
  );
}