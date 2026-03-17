import type { PoolInfo } from '@/hooks/usePoolsInfo';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { createContext } from 'react';
import type { TokenConfig } from './ZoroProvider';

export type TokenConfigWithBalance = { config: TokenConfig; amount: bigint };

type ZoroProviderState = {
  poolAccountId?: AccountId;
  liquidity_pools: PoolInfo[];
  accountId?: AccountId;
  tokens: Record<string, TokenConfig>;
  tokensLoading: boolean;
  pendingNotesCount: number;
  isExpectingNotes: boolean;
  startExpectingNotes: () => void;
};

const initialState: ZoroProviderState = {
  poolAccountId: undefined,
  liquidity_pools: [],
  tokens: {},
  tokensLoading: true,
  pendingNotesCount: 0,
  isExpectingNotes: false,
  startExpectingNotes: () => {},
};

export const ZoroContext = createContext<ZoroProviderState>(initialState);
