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
