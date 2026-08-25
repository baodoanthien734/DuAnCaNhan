/**
 * @fileoverview Custom React Hook quản lý state modal/dialog
 * 
 * Chức năng chính:
 * - Mở/đóng modal với state và handlers
 * - Hỗ trợ truyền data vào modal
 * - Auto-focus management
 * 
 * @example
 * const { isOpen, open, close, data } = useModal();
 * open({ productId: 123 }); // Mở modal với data
 */
'use client';

import { useModalContext } from '@/components/providers/ModalContext';

export function useModal() {
  const modal = useModalContext();

  return {
    alert: modal.alert,
    confirm: modal.confirm,
    prompt: modal.prompt,
  };
}
