import type { PoolInfo } from '@/hooks/usePoolsInfo';
import type { Account, AccountId, ConsumableNote, WebClient } from '@demox-labs/miden-sdk';
import { createContext } from 'react';
import type { TokenConfig } from './ZoroProvider';

type ZoroProviderState = {
  poolAccountId?: AccountId;
  client?: WebClient;
  liquidity_pools: PoolInfo[];
  accountId?: AccountId;
  tokens: Record<string, TokenConfig>;
  tokensLoading: boolean;
  syncState: () => Promise<void>;
  getAccount: (accountId: AccountId) => Promise<Account | undefined>;
  getBalance: (accountId: AccountId, faucetId: AccountId) => Promise<bigint>;
  getConsumableNotes: (accountId: AccountId) => Promise<ConsumableNote[]>;
  consumeNotes: (accountId: AccountId, noteIds: string[]) => Promise<string>;

  // Notes tracking state (for Para wallet)
  pendingNotesCount: number;
  isExpectingNotes: boolean;
  startExpectingNotes: () => void;
  refreshPendingNotes: () => Promise<void>;
};

const initialState: ZoroProviderState = {
  poolAccountId: undefined,
  liquidity_pools: [],
  tokens: {},
  tokensLoading: true,
  syncState: () => Promise.resolve(),
  getAccount: () => Promise.resolve(undefined),
  getBalance: () => Promise.resolve(0n),
  getConsumableNotes: () => Promise.resolve([]),
  consumeNotes: () => Promise.resolve(''),
  pendingNotesCount: 0,
  isExpectingNotes: false,
  startExpectingNotes: () => {},
  refreshPendingNotes: () => Promise.resolve(),
};

export const ZoroContext = createContext<ZoroProviderState>(initialState);
