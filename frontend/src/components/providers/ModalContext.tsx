'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import GlobalModal from '@/components/ui/GlobalModal';
import { registerGlobalModalBridge } from '@/lib/modal-bridge';

type ModalType = 'ALERT' | 'CONFIRM' | 'PROMPT';

type ModalState = {
  isOpen: boolean;
  type: ModalType;
  title?: string;
  message: string;
  placeholder?: string;
  inputValue: string;
};

type ModalContextValue = {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, placeholder?: string, title?: string) => Promise<string | null>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const INITIAL_STATE: ModalState = {
  isOpen: false,
  type: 'ALERT',
  title: '',
  message: '',
  placeholder: '',
  inputValue: '',
};

export function GlobalModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(INITIAL_STATE);
  const resolverRef = useRef<((value: unknown) => void) | null>(null);

  const close = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const open = useCallback((nextState: Omit<ModalState, 'isOpen'>) => {
    setState({ ...nextState, isOpen: true });
  }, []);

  const alert = useCallback((message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      open({
        type: 'ALERT',
        title,
        message,
        placeholder: '',
        inputValue: '',
      });
    });
  }, [open]);

  const confirm = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value) => resolve(Boolean(value));
      open({
        type: 'CONFIRM',
        title,
        message,
        placeholder: '',
        inputValue: '',
      });
    });
  }, [open]);

  const prompt = useCallback((message: string, placeholder?: string, title?: string) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = (value) => resolve((value as string | null) ?? null);
      open({
        type: 'PROMPT',
        title,
        message,
        placeholder: placeholder || '',
        inputValue: '',
      });
    });
  }, [open]);

  const handleConfirm = useCallback(() => {
    const resolve = resolverRef.current;
    resolverRef.current = null;

    if (resolve) {
      if (state.type === 'CONFIRM') {
        resolve(true);
      } else if (state.type === 'PROMPT') {
        resolve(state.inputValue);
      } else {
        resolve(undefined);
      }
    }

    close();
  }, [close, state.inputValue, state.type]);

  const handleCancel = useCallback(() => {
    const resolve = resolverRef.current;
    resolverRef.current = null;

    if (resolve) {
      if (state.type === 'CONFIRM') {
        resolve(false);
      } else if (state.type === 'PROMPT') {
        resolve(null);
      } else {
        resolve(undefined);
      }
    }

    close();
  }, [close, state.type]);

  const contextValue = useMemo<ModalContextValue>(
    () => ({ alert, confirm, prompt }),
    [alert, confirm, prompt],
  );

  useEffect(() => {
    registerGlobalModalBridge({ alert });
    return () => registerGlobalModalBridge(null);
  }, [alert]);

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <GlobalModal
        isOpen={state.isOpen}
        type={state.type}
        title={state.title}
        message={state.message}
        placeholder={state.placeholder}
        inputValue={state.inputValue}
        onInputChange={(value) => setState((prev) => ({ ...prev, inputValue: value }))}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModalContext must be used within GlobalModalProvider');
  }
  return ctx;
}
