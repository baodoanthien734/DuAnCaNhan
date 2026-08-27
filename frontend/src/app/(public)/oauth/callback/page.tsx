/**
 * @fileoverview Trang xử lý callback OAuth2 (Google Login, Facebook Login...)
 * 
 * Chức năng chính:
 * - Hứng accessToken và refreshToken từ Backend trả về qua URL query.
 * - Xóa token khỏi URL ngay lập tức (Bảo mật: Tránh lưu token vào lịch sử duyệt web).
 * - Tạm lưu token vào Cookie để có quyền gọi API lấy Profile.
 * - Gọi API /auth/me để lấy thông tin User đầy đủ.
 * - Cập nhật lại toàn bộ Auth State (Cookie, LocalStorage) và đồng bộ giỏ hàng.
 * - Chuyển hướng người dùng về trang chủ.
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setLoginData } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { syncGuestCartToServer } from '@/lib/cart-api';

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.oauth'); // Kéo i18n vào
  const [statusMessage, setStatusMessage] = useState(t('processing'));

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/?error=' + encodeURIComponent(t('missingInfo')));
      return;
    }

    // Bảo mật: Xóa token khỏi thanh URL ngay lập tức
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const processLogin = async () => {
      try {
        // Tạm lưu token vào cookie
        setLoginData({ accessToken, refreshToken, user: null });

        // Lấy thông tin user profile đầy đủ
        const res = await apiClient.get('/auth/me');
        const user = res.data;

        // Lưu thông tin đầy đủ vào Cookie & localStorage
        setLoginData({ accessToken, refreshToken, user });

        try {
          await syncGuestCartToServer();
        } catch {
          // Bỏ qua lỗi giỏ hàng
        }

        window.location.href = '/';
      } catch {
        setStatusMessage(t('failed'));
        setTimeout(() => {
          router.replace('/?error=' + encodeURIComponent(t('failed')));
        }, 1500);
      }
    };

    processLogin();
  }, [router, searchParams, t]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="text-sm font-medium text-slate-700">{statusMessage}</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    }>
      <OAuthCallbackHandler />
    </Suspense>
  );
}