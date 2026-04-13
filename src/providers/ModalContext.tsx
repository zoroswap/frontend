import { emptyFn } from '@/lib/shared';
import { createContext, type ReactNode } from 'react';

interface ModalContextProps {
  openModal: (c: ReactNode) => void;
  closeModal: () => void;
}

export const ModalContext = createContext({
  openModal: emptyFn,
  closeModal: emptyFn,
} as ModalContextProps);
