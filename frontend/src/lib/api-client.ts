import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Đảm bảo đúng port Backend của bạn

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window === 'undefined') return config;

    const token = Cookies.get('accessToken');
    if (token && config && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    const locale = Cookies.get('NEXT_LOCALE') || 'vi';
    if (config && config.headers) {
      (config.headers as any)['Accept-Language'] = locale;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: thử refresh token khi gặp 401 và retry request
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Hàm phụ trợ dọn dẹp khi đăng xuất/hết hạn
const forceLogout = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('userId');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_info');
    // Reload lại trang hiện tại thay vì đá về '/' để UX mượt hơn
    window.location.reload(); 
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (typeof window === 'undefined' || !error.response) return Promise.reject(error);

    // Bắt lỗi 401
    if (error.response.status === 401 && !originalRequest._retry) {
      (originalRequest as any)._retry = true;

      // LOG 1: Báo hiệu Token đã hết hạn
      console.log(
        '%c[AUTH ENGINE] ⚠️ Access Token đã hết hạn (401)! Bắt đầu quy trình gia hạn...',
        'color: #f59e0b; font-weight: bold; font-size: 12px;'
      );

      const refreshToken = Cookies.get('refreshToken');
      
      let userIdStr = Cookies.get('userId');
      let userId = userIdStr ? Number(userIdStr) : undefined;

      if (!userId) {
        const userInfoStr = localStorage.getItem('user_info');
        if (userInfoStr) {
          try {
            const user = JSON.parse(userInfoStr);
            userId = user.id;
          } catch (e) {}
        }
      }

      // Nếu thiếu thông tin để refresh
      if (!refreshToken || !userId) {
        console.log(
          '%c[AUTH ENGINE] ❌ Không tìm thấy Refresh Token hoặc UserId. Ép buộc Logout!',
          'color: #ef4444; font-weight: bold; font-size: 12px;'
        );
        forceLogout();
        return Promise.reject(error);
      }

      // Nếu đang trong quá trình refresh, đưa các API khác vào hàng đợi
      if (isRefreshing) {
        console.log(
          `%c[AUTH ENGINE] ⏳ Đang có request refresh khác chạy, đưa API [${originalRequest.url}] vào hàng đợi...`,
          'color: #3b82f6;'
        );
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            (originalRequest.headers as any).Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        console.log(
          '%c[AUTH ENGINE] 🔄 Đang gửi Refresh Token lên Backend (/auth/refresh)...',
          'color: #8b5cf6; font-weight: bold;'
        );

        const resp = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { userId, refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { accessToken, refreshToken: newRefreshToken } = resp.data;

        // Lưu Token mới vào Cookie
        Cookies.set('accessToken', accessToken);
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken);
        }

        // LOG 2: Báo hiệu cấp thành công
        console.log(
          '%c[AUTH ENGINE] ✅ Đã cấp Access Token mới thành công! Đang tự động chạy lại API bị kẹt...',
          'color: #10b981; font-weight: bold; font-size: 12px;'
        );

        (originalRequest.headers as any).Authorization = `Bearer ${accessToken}`;
        onRefreshed(accessToken);
        return apiClient(originalRequest);

      } catch (refreshError) {
        // LOG 3: Báo hiệu Refresh thất bại (Ví dụ: Refresh Token hết hạn 7 ngày)
        console.log(
          '%c[AUTH ENGINE] 💥 Refresh Token hết hạn hoặc không hợp lệ. Đăng xuất!',
          'color: #dc2626; font-weight: bold; font-size: 12px;'
        );
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);