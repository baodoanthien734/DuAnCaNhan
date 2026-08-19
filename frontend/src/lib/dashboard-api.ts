export const getServerDashboardStats = async (token: string) => {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Lưu ý: Nếu Backend của bạn có global tiền tố /api, hãy nhớ thêm nó vào đây
    // Ví dụ: `${API_BASE}/api/admin/dashboard/stats`
    const res = await fetch(`${API_BASE}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', 
    });
    
    // THÊM ĐOẠN LOG NÀY ĐỂ BẮT MÃ LỖI TỪ BACKEND
    if (!res.ok) {
      console.error(`❌ Backend từ chối API! Mã lỗi: ${res.status} - ${res.statusText}`);
      const errorText = await res.text();
      console.error(`Chi tiết từ Backend: ${errorText}`);
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error('Lỗi kết nối server-side:', error);
    return null;
  }
};