import { createContext, type ReactNode } from 'react';
import { emptyFn } from '../utils/shared';

interface ModalContextProps {
  openModal: (c: ReactNode) => void;
  closeModal: () => void;
}

export const ModalContext = createContext({
  openModal: emptyFn,
  closeModal: emptyFn,
} as ModalContextProps);
