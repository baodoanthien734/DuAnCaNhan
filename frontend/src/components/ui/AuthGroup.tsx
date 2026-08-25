'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Cookies from 'js-cookie';
import AuthModal from '@/components/ui/AuthModal';
import CartDrawer from '@/components/ui/CartDrawer';
import { logout } from '@/lib/auth';
import { getProfile } from '@/lib/user-api';
import { resolveImageUrl } from '@/lib/utils';
import { getCart } from '@/lib/cart-api';

type User = {
  id: number;
  email: string;
  name?: string;
  image?: string | null;
  roles: string[];
};

export default function AuthGroup() {
  const t = useTranslations('public_pages');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialView, setInitialView] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // State cho User Dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // MỚI: Hàm lấy tổng số lượng giỏ hàng
  const fetchCartCount = async () => {
    try {
      const cartData = await getCart();
      if (cartData && cartData.items) {
        // Đếm theo SỐ DÒNG (Line Items) - Chỉ cần lấy độ dài của mảng items
        setCartItemCount(cartData.items.length);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error('Lỗi khi lấy số lượng giỏ hàng:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const refreshToken = Cookies.get('refreshToken');
    const userInfo = localStorage.getItem('user_info');

    if (userInfo && !refreshToken) {
      localStorage.removeItem('user_info');
      Cookies.remove('accessToken');
      Cookies.remove('userId');
      setUser(null);
      // Khi user bị clear, cũng fetch lại cart (để lấy giỏ hàng guest)
      fetchCartCount();
      return;
    }

    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo) as User;
        setUser(parsedUser);

        getProfile()
          .then((profile) => {
            const nextUser: User = {
              ...parsedUser,
              name: profile?.name ?? parsedUser.name,
              image: profile?.image ?? null,
            };
            setUser(nextUser);
            localStorage.setItem('user_info', JSON.stringify(nextUser));
          })
          .catch(() => {});
      }
      catch (error) { localStorage.removeItem('user_info'); setUser(null); }
    }
    
    // Gọi fetch giỏ hàng lần đầu khi mount
    fetchCartCount();
  }, []);

  // Đóng User menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lắng nghe các sự kiện liên quan đến Giỏ hàng
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    const handleCartUpdated = () => fetchCartCount();

    window.addEventListener('open-cart', handleOpenCart);
    window.addEventListener('cart-updated', handleCartUpdated);
    
    return () => {
      window.removeEventListener('open-cart', handleOpenCart);
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, []);

  const handleLogout = async () => {
    setUser(null);
    setIsUserMenuOpen(false);
    await logout();
    // Sau khi đăng xuất, cập nhật lại số lượng giỏ hàng (sẽ chuyển về guest cart)
    fetchCartCount();
  };

  if (!isClient) return <div className="w-[150px]"></div>;

  const avatarUrl = user?.image ? resolveImageUrl(user.image) : '';

  return (
    <div className="flex items-center gap-3 relative" ref={userMenuRef}>
      
      <button 
        onClick={() => setIsCartOpen(true)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
        title={t('header.cart')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm border-2 border-white">
            {cartItemCount > 99 ? '99+' : cartItemCount}
          </span>
        )}
      </button>

      {user ? (
        <>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-transparent hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-700 hidden md:block">
              {user.name || user.email.split('@')[0]}
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name || user.email} className="w-full h-full object-cover" />
              ) : (
                (user.name || user.email).charAt(0).toUpperCase()
              )}
            </div>
          </button>

          {isUserMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 z-50 overflow-hidden">
            
            <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('header.profile')}
            </Link>
            
            <Link href="/orders" onClick={() => setIsUserMenuOpen(false)} className="flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {t('header.orders')}
            </Link>

            {user.roles.includes('ADMIN') && (
            <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className="flex items-center px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors border-y border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('header.adminPanel')}
            </Link>
            )}

            <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('header.logout')}
            </button>
          </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setInitialView('login'); setIsModalOpen(true); }} 
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
          >
            {t('header.login')}
          </button>
          <button 
            onClick={() => { setInitialView('register'); setIsModalOpen(true); }} 
            className="text-sm font-semibold bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-md"
          >
            {t('header.register')}
          </button>
        </div>
      )}

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRequireLogin={() => { setIsCartOpen(false); setInitialView('login'); setIsModalOpen(true); }} 
        onCartChange={fetchCartCount} 
      />
      
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialView={initialView} />
    </div>
  );
}