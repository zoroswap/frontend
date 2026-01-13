import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { bech32ToAccountId, instantiateClient } from '@/lib/utils';
import { AccountId, Address, WebClient } from '@demox-labs/miden-sdk';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZoroContext } from './ZoroContext';

// Simple mutex for client operations to prevent concurrent WASM access
class ClientMutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

const clientMutex = new ClientMutex();

// Shared sync throttling: avoid redundant network syncs
let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 1500;

enum ClientState {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
}

export function ZoroProvider({
  children,
}: { children: ReactNode }) {
  const { data: poolsInfo, isFetched: isPoolsInfoFetched } = usePoolsInfo();
  const { address, accountId: unifiedAccountId, paraClient, walletType } = useUnifiedWallet();
  // Use accountId from UnifiedWallet if available (Para), otherwise derive from address (Miden)
  const accountId = useMemo(
    () => unifiedAccountId ?? (address ? Address.fromBech32(address).accountId() : undefined),
    [address, unifiedAccountId],
  );
  const [midenClient, setMidenClient] = useState<WebClient | undefined>(undefined);
  const clientState = useRef<ClientState>(ClientState.NOT_INITIALIZED);

  // For Para users, use paraClient; for Miden users, create our own client
  const client = walletType === 'para' ? paraClient : midenClient;

  // For Para users, mark client state as IDLE when paraClient is ready
  useEffect(() => {
    if (walletType === 'para' && paraClient) {
      clientState.current = ClientState.IDLE;
    }
  }, [walletType, paraClient]);

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
      clientState.current = ClientState.IDLE;
    })();
  }, [poolsInfo, accountId, midenClient, walletType]);

  // Helper to run operations with the mutex lock
  const withClientLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    await clientMutex.acquire();
    try {
      return await fn();
    } finally {
      clientMutex.release();
    }
  }, []);

  // Throttled sync: only syncs if enough time has passed since last sync
  const throttledSync = useCallback(async () => {
    if (!client) return;
    const now = Date.now();
    if (now - lastSyncTime >= SYNC_THROTTLE_MS) {
      await client.syncState();
      lastSyncTime = now;
    }
  }, [client]);

  const syncState = useCallback(async () => {
    if (!client) {
      return;
    }
    if (clientState.current === ClientState.NOT_INITIALIZED) {
      // For Para users, client might be ready before state is set
      if (walletType === 'para') {
        clientState.current = ClientState.IDLE;
      } else {
        return;
      }
    }
    await withClientLock(async () => {
      await throttledSync();
    });
  }, [client, walletType, withClientLock, throttledSync]);

  const getAccount = useCallback(async (accountId: AccountId) => {
    if (clientState.current === ClientState.NOT_INITIALIZED) {
      return;
    }
    return withClientLock(async () => {
      await throttledSync();
      return await client?.getAccount(accountId);
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
