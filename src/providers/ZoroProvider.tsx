import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { bech32ToAccountId, instantiateClient } from '@/lib/utils';
import { AccountId, Address, WebClient } from '@demox-labs/miden-sdk';
import { Mutex } from 'async-mutex';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZoroContext } from './ZoroContext';

const SYNC_THROTTLE_MS = 1500;

export function ZoroProvider({
  children,
}: { children: ReactNode }) {
  const { data: poolsInfo, isFetched: isPoolsInfoFetched } = usePoolsInfo();
  // Mutex to prevent concurrent access to the Miden client
  const clientMutex = useRef(new Mutex());
  const lastSyncTime = useRef(0);
  const { address, accountId: unifiedAccountId, paraClient, walletType } = useUnifiedWallet();
  // Use accountId from UnifiedWallet if available (Para), otherwise derive from address (Miden)
  const accountId = useMemo(
    () => unifiedAccountId ?? (address ? Address.fromBech32(address).accountId() : undefined),
    [address, unifiedAccountId],
  );
  const [midenClient, setMidenClient] = useState<WebClient | undefined>(undefined);

  // For Para users, use paraClient; for Miden users, create our own client
  const client = walletType === 'para' ? paraClient : midenClient;

  // Only create a client for Miden wallet users
  useEffect(() => {
    if (walletType === 'para' || midenClient || !accountId || !poolsInfo) {
      return;
    }
    (async () => {
      const c = await instantiateClient({
        accountsToImport: [
          ...(accountId
            ? [accountId, bech32ToAccountId(poolsInfo.poolAccountId) as AccountId]
            : []),
        ],
      });
      setMidenClient(c);
    })();
  }, [poolsInfo, accountId, midenClient, walletType]);

  // Helper to run operations with the mutex lock
  const withClientLock = useCallback(
    <T,>(fn: () => Promise<T>): Promise<T> => clientMutex.current.runExclusive(fn),
    [],
  );

  // Throttled sync: only syncs if enough time has passed since last sync
  const throttledSync = useCallback(async () => {
    if (!client) return;
    const now = Date.now();
    if (now - lastSyncTime.current >= SYNC_THROTTLE_MS) {
      await client.syncState();
      lastSyncTime.current = now;
    }
  }, [client]);

  const syncState = useCallback(async () => {
    if (!client) {
      return;
    }
    await withClientLock(async () => {
      await throttledSync();
    });
  }, [client, withClientLock, throttledSync]);

  const getAccount = useCallback(async (accountId: AccountId) => {
    if (!client) {
      return;
    }
    return withClientLock(async () => {
      await throttledSync();
      return await client.getAccount(accountId);
    });
  }, [client, withClientLock, throttledSync]);

  const value = useMemo(() => {
    return {
      tokens: generateTokenMetadata(poolsInfo?.liquidityPools || []),
      tokensLoading: !isPoolsInfoFetched,
      liquidity_pools: poolsInfo?.liquidityPools || [],
      poolAccountId: poolsInfo?.poolAccountId
        ? bech32ToAccountId(poolsInfo.poolAccountId)
        : undefined,
      accountId,
      syncState,
      getAccount,
      client,
      withClientLock,
    };
  }, [accountId, poolsInfo, isPoolsInfoFetched, syncState, getAccount, client, withClientLock]);

  return (
    <ZoroContext.Provider value={{ ...value }}>
      {children}
    </ZoroContext.Provider>
  );
}

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  faucetId: AccountId;
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
