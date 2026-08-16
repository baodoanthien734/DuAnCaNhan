// src/lib/auth.ts
import Cookies from 'js-cookie';

// 1. Lấy thông tin User lưu tạm trong localStorage (Dùng hiển thị Header, Avatar, Name...)
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user_info');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// 1.5. Khi login thành công: set tokens và userId vào cookie, và optional localStorage user_info
export const setLoginData = (data: { accessToken: string; refreshToken: string; user: any }) => {
  if (typeof window === 'undefined') return;
  const { accessToken, refreshToken, user } = data;
  // Set cookies (client-side non-HttpOnly). In production set secure: true.
  Cookies.set('accessToken', accessToken, { path: '/', sameSite: 'lax' });
  Cookies.set('refreshToken', refreshToken, { path: '/', sameSite: 'lax' });
  // Store minimal userId in cookie so SSR/middleware can read it
  if (user && user.id) Cookies.set('userId', String(user.id), { path: '/', sameSite: 'lax' });

  // Keep user_info for UI convenience (optional)
  try {
    localStorage.setItem('user_info', JSON.stringify(user));
  } catch {}
};

// 2. Hàm Đăng xuất (Logout) dùng chung cho toàn bộ dự án
export const logout = async () => {
  if (typeof window === 'undefined') return;
  try {
    // Gọi backend để revoke refresh token nếu có
    const token = Cookies.get('accessToken');
    if (token) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // ignore errors
  }

  // Xóa sạch Token và userId trong Cookie
  Cookies.remove('accessToken', { path: '/' });
  Cookies.remove('refreshToken', { path: '/' });
  Cookies.remove('userId', { path: '/' });

  // Xóa thông tin User trong localStorage
  localStorage.removeItem('user_info');

  // Điều hướng về trang Login
  window.location.href = '/';
};