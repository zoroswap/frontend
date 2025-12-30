import type { PoolInfo } from '@/hooks/usePoolsInfo';
import type { Account, AccountId, WebClient } from '@demox-labs/miden-sdk';
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
};

const initialState: ZoroProviderState = {
  poolAccountId: undefined,
  liquidity_pools: [],
  tokens: {},
  tokensLoading: true,
  syncState: () => Promise.resolve(),
  getAccount: () => Promise.resolve(undefined),
};

export const ZoroContext = createContext<ZoroProviderState>(initialState);
