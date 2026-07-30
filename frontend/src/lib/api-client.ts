import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động đính kèm Access Token vào mọi Request gửi đi
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window === 'undefined') return config;
    const token = Cookies.get('accessToken');
    if (token && config && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`;
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu chạy trên server hoặc không có response, từ chối luôn
    if (typeof window === 'undefined' || !error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest._retry) {
      (originalRequest as any)._retry = true;

      const refreshToken = Cookies.get('refreshToken');
      // Read minimal userId from cookie instead of localStorage to support SSR/middleware
      const userIdStr = Cookies.get('userId');
      const userId = userIdStr ? Number(userIdStr) : undefined;

      // Nếu không có refresh token hoặc userId -> buộc logout
      if (!refreshToken || !userId) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Nếu đang refresh, chờ đến khi có token mới rồi retry
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            (originalRequest.headers as any).Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        // Dùng axios thô để gọi endpoint refresh (tránh recursion vào interceptor)
        const resp = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { userId, refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { accessToken, refreshToken: newRefreshToken } = resp.data;

        // Lưu token mới vào Cookie
        Cookies.set('accessToken', accessToken);
        Cookies.set('refreshToken', newRefreshToken);

        // Retry original request với access token mới
        (originalRequest.headers as any).Authorization = `Bearer ${accessToken}`;
        onRefreshed(accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Nếu refresh thất bại -> logout
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
