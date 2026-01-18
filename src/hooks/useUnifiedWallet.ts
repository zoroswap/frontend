import { UnifiedWalletContext } from '@/providers/UnifiedWalletContext';
import { useContext } from 'react';

export function useUnifiedWallet() {
  return useContext(UnifiedWalletContext);
}
