'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Chỉ cần lấy thông tin user đã lưu ở localStorage ra hiển thị
    const userStr = localStorage.getItem('user_info');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user_info', e);
      }
    }
  }, []);

  const handleLogout = () => {
    // Xóa Cookie & Storage
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    localStorage.removeItem('user_info');
    
    // Tải lại trang, Middleware sẽ tự phát hiện không còn Token và đẩy về /login
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>🎉 Màn hình Home</h1>
      {user ? (
        <p>Xin chào, <b>{user.name}</b> ({user.email})</p>
      ) : (
        <p>Xin chào quý khách!</p>
      )}
      <button 
        onClick={handleLogout} 
        style={{ padding: '8px 16px', marginTop: '20px', cursor: 'pointer', backgroundColor: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Đăng xuất
      </button>
    </div>
  );
}