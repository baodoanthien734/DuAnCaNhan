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

// 2. Hàm Đăng xuất (Logout) dùng chung cho toàn bộ dự án
export const logout = () => {
  // Xóa sạch Token trong Cookie
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  
  // Xóa thông tin User trong localStorage
  localStorage.removeItem('user_info');
  
  // Điều hướng về trang Login, proxy.ts sẽ lập tức nhận diện không còn Token
  window.location.href = '/login';
};