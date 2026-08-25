/**
 * @fileoverview Client-side Auth Verification Component
 * 
 * Chức năng chính:
 * - Verify user có access token trên client side
 * - Redirect nếu chưa login
 * - Backup verification cho middleware
 * 
 * Use case:
 * - Middleware chạy trên edge, có thể miss cookies
 * - Component này verify trên client-side để đảm bảo
 * 
 * Props:
 * - children: Child components chỉ render khi đã login
 * 
 * Logic:
 * 1. Check accessToken cookie
 * 2. Nếu không có → redirect về /
 * 3. Nếu có → render children
 */
'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

export default function ClientAuthVerifier() {
  const t = useTranslations('admin_sidebar');

  useEffect(() => {
    let isMounted = true;

    apiClient
      .get('/auth/me')
      .then(() => {
        if (!isMounted) return;
        window.location.reload();
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Admin session verification failed on client:', error);
        // Axios interceptor toàn cục sẽ xử lý clear session + modal + redirect.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto h-11 w-11 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="mt-5 text-base font-semibold text-slate-900">{t('session_refreshing')}</p>
        <p className="mt-2 text-sm text-slate-500">{t('session_refreshing_hint')}</p>
      </div>
    </div>
  );
}
