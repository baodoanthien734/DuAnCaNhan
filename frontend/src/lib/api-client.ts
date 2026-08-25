import axios from 'axios';
import Cookies from 'js-cookie';
import { showGlobalAlert } from './modal-bridge';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'; 
const REFRESH_ENDPOINT = '/auth/refresh';

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

let isRefreshing = false;
let isForceHandlingUnauthorized = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const UNAUTHORIZED_MESSAGE = 'Tài khoản của bạn đã bị khóa hoặc phiên đăng nhập đã hết hạn';

const isRefreshEndpoint = (url?: string) => {
  if (!url) return false;
  return url.includes(REFRESH_ENDPOINT);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string | null) => void) => {
  refreshSubscribers.push(callback);
};

const clearClientSession = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('userId');

  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_info');
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
  }
};

const handleUnauthorizedExit = async () => {
  clearClientSession();

  if (isForceHandlingUnauthorized) return;
  isForceHandlingUnauthorized = true;

  try {
    await showGlobalAlert(UNAUTHORIZED_MESSAGE);
  } finally {
    window.location.replace('/');
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (typeof window === 'undefined' || !error.response || !originalRequest) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      const requestUrl = typeof originalRequest.url === 'string' ? originalRequest.url : 'unknown_url';

      // 🔥 DANH SÁCH MIỄN TRỪ (BYPASS URLS) 🔥
      // Các API này nếu trả 401 thì ném lỗi thẳng ra Component/Form để hiển thị text (VD: Sai mật khẩu, OTP hết hạn)
      const bypassUrls = ['/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp'];
      const isAuthApi = bypassUrls.some(url => requestUrl.includes(url));
      
      if (isAuthApi) {
        console.log(`[AXIOS] Bỏ qua 401 cho API Auth: ${requestUrl}. Trả quyền báo lỗi cho Form.`);
        return Promise.reject(error); 
      }

      console.log(`🚨 [AXIOS] Phát hiện lỗi 401 từ URL: ${requestUrl}`);

      if ((originalRequest as any)._retry) {
        console.log("⚠️ [AXIOS] Request này đã được retry nhưng vẫn lỗi 401. Hủy bỏ để tránh lặp vô tận!");
        await handleUnauthorizedExit();
        return Promise.reject(error);
      }

      if (isRefreshEndpoint(requestUrl)) {
        console.log("💀 [AXIOS] Bản thân API Refresh cũng bị từ chối (401). Refresh token đã chết hoặc tài khoản bị khóa!");
        await handleUnauthorizedExit();
        return Promise.reject(error);
      }

      const refreshToken = Cookies.get('refreshToken');
      let userId = Cookies.get('userId');

      if (!userId && typeof window !== 'undefined') {
        const userInfoStr = localStorage.getItem('user_info');
        if (userInfoStr) {
          try {
            const user = JSON.parse(userInfoStr);
            userId = user?.id ? String(user.id) : undefined;
          } catch {
            userId = undefined;
          }
        }
      }

      if (!refreshToken || !userId) {
        console.log("🛑 [AXIOS] Không tìm thấy Refresh Token hoặc User ID. Ép đăng xuất!");
        await handleUnauthorizedExit();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log(`⏳ [AXIOS] Một tiến trình refresh đang chạy, đưa request tới ${requestUrl} vào hàng đợi...`);
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            if (!token) {
              reject(error);
              return;
            }

            if (originalRequest.headers) {
              (originalRequest.headers as any).Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      console.log("🔄 [AXIOS] Bắt đầu gọi API âm thầm xin cấp lại Token mới...");

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}${REFRESH_ENDPOINT}`,
          {
            userId: Number(userId),
            refreshToken,
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const newAccessToken = refreshResponse.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        Cookies.set('accessToken', newAccessToken, { path: '/', sameSite: 'lax' });
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, { path: '/', sameSite: 'lax' });
        }

        console.log("✅ [AXIOS] Xin Token mới thành công! Đang giải phóng hàng đợi và chạy lại request cũ...");
        onRefreshed(newAccessToken);
        (originalRequest as any)._retry = true;

        if (originalRequest.headers) {
          (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError: any) {
        const refreshStatus = refreshError?.response?.status;
        console.log(`❌ [AXIOS] Nỗ lực Refresh Token thất bại (status: ${refreshStatus ?? 'unknown'}). Buộc đăng xuất!`);
        onRefreshed(null);

        if ([401, 403, 404].includes(Number(refreshStatus))) {
          await handleUnauthorizedExit();
          return Promise.reject(refreshError);
        }

        await handleUnauthorizedExit();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);