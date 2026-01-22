import type { AccountId } from '@demox-labs/miden-sdk';
import type { CustomTransaction, Transaction } from '@demox-labs/miden-wallet-adapter';
import { createContext } from 'react';

export type WalletType = 'miden' | 'para' | null;

export type TransactionRequest =
  | Transaction
  | { type: 'Custom'; payload: CustomTransaction };

export interface UnifiedWalletState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  walletType: WalletType;

  // Account info (Miden format for both wallet types)
  address: string | null; // Bech32 Miden address
  accountId: AccountId | undefined;

  // Actions
  requestTransaction: (tx: TransactionRequest) => Promise<string | undefined>;
  disconnect: () => Promise<void>;
}

export const UnifiedWalletContext = createContext<UnifiedWalletState>({
  connected: false,
  connecting: false,
  walletType: null,
  address: null,
  accountId: undefined,
  requestTransaction: async () => undefined,
  disconnect: async () => {},
});
