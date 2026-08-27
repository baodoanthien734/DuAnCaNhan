/**
 * @fileoverview Component Logic ẩn (Tàng hình) chuyên bắt lỗi Xác thực từ URL
 * 
 * Chức năng chính:
 * - Lắng nghe query param `?error=...` trên thanh địa chỉ.
 * - Được dùng để hứng lỗi từ luồng OAuth (Ví dụ: Admin không được phép đăng nhập Google).
 * - Khi phát hiện lỗi: Kích hoạt hiển thị thông báo (Global Alert / Toast).
 * - Dọn dẹp URL: Xóa biến `error` khỏi thanh địa chỉ để tránh thông báo bị bật lại khi user reload trang.
 * 
 * Lưu ý: Component này trả về `null`, không render bất kỳ UI nào ra DOM.
 */
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { showGlobalAlert } from '@/lib/modal-bridge';

export default function AuthErrorHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      showGlobalAlert(decodeURIComponent(error));
      
      // Xóa query param trên URL sau khi đã hiển thị alert
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('error');
      router.replace(currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
    }
  }, [searchParams, router]);

  return null;
}