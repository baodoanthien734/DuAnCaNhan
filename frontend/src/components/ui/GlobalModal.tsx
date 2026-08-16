'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

type ModalType = 'ALERT' | 'CONFIRM' | 'PROMPT';

type GlobalModalProps = {
  isOpen: boolean;
  type: ModalType;
  title?: string;
  message: string;
  placeholder?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function GlobalModal({
  isOpen,
  type,
  title,
  message,
  placeholder,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: GlobalModalProps) {
  const t = useTranslations('global_modal');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen && type === 'PROMPT') {
      inputRef.current?.focus();
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const resolvedTitle = title || t(`title.${type.toLowerCase()}`);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={resolvedTitle}
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-bold text-slate-900">{resolvedTitle}</h3>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{message}</p>

          {type === 'PROMPT' && (
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder || ''}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          {(type === 'CONFIRM' || type === 'PROMPT') && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('button.cancel')}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {type === 'ALERT' ? t('button.ok') : type === 'CONFIRM' ? t('button.confirm') : t('button.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
