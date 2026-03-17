import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { bech32ToAccountId } from '@/lib/utils';
import { useWallet } from '@miden-sdk/miden-wallet-adapter';
import { useMiden, useNotes } from '@miden-sdk/react';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZoroContext } from './ZoroContext';

export interface FaucetParams {
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

export function ZoroProvider({ children }: { children: ReactNode }) {
  const { data: poolsInfo, isFetched: isPoolsInfoFetched } = usePoolsInfo();
  const { client, isReady } = useMiden();
  const { connected, address } = useWallet();
  const accountId = useMemo((): AccountId | undefined => {
    if (!connected || !address) return undefined;
    return bech32ToAccountId(address);
  }, [connected, address]);
  const accountIdStr = accountId?.toString();
  const [expectedNotesCount, setExpectedNotesCount] = useState(0);
  const lastImportedAccountRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !client || !accountId) return;
    const idStr = accountId.toString();
    if (lastImportedAccountRef.current === idStr) return;
    lastImportedAccountRef.current = idStr;
    (async () => {
      try {
        await client.importAccountById(accountId);
        await client.syncState();
      } catch (e) {
        console.warn('Wallet account import/sync:', e);
        lastImportedAccountRef.current = null;
      }
    })();
  }, [isReady, client, accountId]);

  const { consumableNotes } = useNotes({
    accountId: connected ? accountIdStr : undefined,
    status: 'committed',
  });
  const pendingNotesCount = consumableNotes.length;
  const lastCountRef = useRef(-1);

  useEffect(() => {
    if (lastCountRef.current >= 0 && pendingNotesCount > lastCountRef.current) {
      const arrived = pendingNotesCount - lastCountRef.current;
      setExpectedNotesCount(c => Math.max(0, c - arrived));
    }
    lastCountRef.current = pendingNotesCount;
  }, [pendingNotesCount]);

  const startExpectingNotes = useCallback(() => {
    setExpectedNotesCount(c => c + 1);
  }, []);

  const value = useMemo(() => ({
    tokens: generateTokenMetadata(poolsInfo?.liquidityPools || []),
    tokensLoading: !isPoolsInfoFetched,
    liquidity_pools: poolsInfo?.liquidityPools || [],
    poolAccountId: poolsInfo?.poolAccountId
      ? bech32ToAccountId(poolsInfo.poolAccountId)
      : undefined,
    accountId,
    pendingNotesCount,
    isExpectingNotes: expectedNotesCount > 0,
    startExpectingNotes,
  }), [
    accountId,
    poolsInfo,
    isPoolsInfoFetched,
    pendingNotesCount,
    expectedNotesCount,
    startExpectingNotes,
  ]);

  return (
    <ZoroContext.Provider value={value}>
      {children}
    </ZoroContext.Provider>
  );
}

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  faucetId: import('@miden-sdk/miden-sdk').AccountId;
  faucetIdBech32: string;
  oracleId: string;
}

const generateTokenMetadata = (pools: PoolInfo[]) => {
  const tokens: Record<string, TokenConfig> = {};
  for (const pool of pools) {
    tokens[pool.faucetIdBech32] = {
      symbol: pool.symbol,
      name: pool.name,
      decimals: pool.decimals,
      faucetId: pool.faucetId,
      faucetIdBech32: pool.faucetIdBech32,
      oracleId: pool.oracleId,
    };
  }
  return tokens;
};
