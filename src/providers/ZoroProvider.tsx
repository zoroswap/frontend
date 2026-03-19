import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { clientMutex } from '@/lib/clientMutex';
import { NETWORK } from '@/lib/config';
import { accountIdToBech32, bech32ToAccountId, instantiateClient } from '@/lib/utils';
import {
  AccountId,
  AccountStorageMode,
  Address,
  AuthScheme,
  BasicFungibleFaucetComponent,
  Endpoint,
  Note,
  NoteType,
  OutputNoteState,
  RpcClient,
  WebClient,
} from '@miden-sdk/miden-sdk';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParaClient } from './ParaClientContext';
import { ZoroContext } from './ZoroContext';

const SYNC_THROTTLE_MS = 1500;

export interface FaucetParams {
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

export function ZoroProvider({
  children,
}: { children: ReactNode }) {
  const { data: poolsInfo, isFetched: isPoolsInfoFetched } = usePoolsInfo();
  const lastSyncTime = useRef(0);
  const { address, accountId: unifiedAccountId, walletType } = useUnifiedWallet();
  const paraClient = useParaClient();
  // Use accountId from UnifiedWallet if available (Para), otherwise derive from address (Miden)
  const accountId = useMemo(
    () =>
      unifiedAccountId ?? (address ? Address.fromBech32(address).accountId() : undefined),
    [address, unifiedAccountId],
  );
  const [midenClient, setMidenClient] = useState<WebClient | undefined>(undefined);
  const rpcClientRef = useRef<RpcClient | null>(null);

  // For Para users, use paraClient; for Miden users, create our own client
  const client = walletType === 'para' ? paraClient : midenClient;

  const rpcClient = useMemo(() => {
    if (!rpcClientRef.current) {
      rpcClientRef.current = new RpcClient(new Endpoint(NETWORK.rpcEndpoint));
    }
    return rpcClientRef.current;
  }, []);

  // Only create a client for Miden wallet users
  useEffect(() => {
    if (walletType === 'para' || midenClient || !accountId || !poolsInfo) {
      return;
    }
    (async () => {
      const c = await instantiateClient({
        accountsToImport: [
          ...(accountId ? [accountId] : []),
        ],
      });
      setMidenClient(c);
    })();
  }, [poolsInfo, accountId, midenClient, walletType]);

  // Helper to run operations with the mutex lock
  const withClientLock = useCallback(
    <T,>(fn: () => Promise<T>): Promise<T> => clientMutex.runExclusive(fn),
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

  const getNoteStatus = useCallback(
    async (
      noteId: string,
    ): Promise<'consumed' | 'committed' | 'pending' | 'processing' | 'unknown'> => {
      if (!client) return 'unknown';
      return withClientLock(async () => {
        const summary = await client.syncState();
        const consumedIds = summary.consumedNotes().map((
          id: { toString: () => string },
        ) => id.toString());
        if (consumedIds.includes(noteId)) return 'consumed';
        try {
          const record = await client.getOutputNote(noteId);
          const state = record.state();
          if (state === OutputNoteState.Consumed) return 'consumed';
          if (
            state === OutputNoteState.CommittedPartial
            || state === OutputNoteState.CommittedFull
          ) {
            return 'committed';
          }
          if (
            state === OutputNoteState.ExpectedPartial
            || state === OutputNoteState.ExpectedFull
          ) {
            return 'pending';
          }
          return 'processing';
        } catch {
          return 'pending';
        }
      });
    },
    [client, withClientLock],
  );

  const getAccount = useCallback(async (accountId: AccountId) => {
    if (!client) {
      return;
    }
    return withClientLock(async () => {
      await throttledSync();
      return await client.getAccount(accountId);
    });
  }, [client, withClientLock, throttledSync]);

  const getBalance = useCallback(async (accountId: AccountId, faucetId: AccountId) => {
    if (!client) {
      return 0n;
    }
    return withClientLock(async () => {
      await throttledSync();
      const account = await client.getAccount(accountId);
      return BigInt(account?.vault().getBalance(faucetId) ?? 0);
    });
  }, [client, withClientLock, throttledSync]);

  const getConsumableNotes = useCallback(async (accountId: AccountId) => {
    if (!client) {
      return [];
    }
    return withClientLock(async () => {
      await throttledSync();
      const account = await client.getAccount(accountId);
      if (!account) return [];
      return await client.getConsumableNotes(account.id());
    });
  }, [client, withClientLock, throttledSync]);

  const consumeNotes = useCallback(async (accountId: AccountId, notes: Note[]) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    return withClientLock(async () => {
      const account = await client.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      const consumeTxRequest = client.newConsumeTransactionRequest(notes);
      const txHash = await client.submitNewTransaction(account.id(), consumeTxRequest);
      return txHash.toHex();
    });
  }, [client, withClientLock]);

  // Notes tracking state (for Para wallet)
  const [pendingNotesCount, setPendingNotesCount] = useState(0);
  const [expectedNotesCount, setExpectedNotesCount] = useState(0);
  const lastKnownCountRef = useRef(-1);
  const isRefreshingRef = useRef(false);

  const isExpectingNotes = expectedNotesCount > 0;

  // Call when user initiates an action that will result in receiving notes
  const startExpectingNotes = useCallback(() => {
    setExpectedNotesCount(c => c + 1);
  }, []);

  // Refresh pending notes count and detect when expected notes arrive
  const refreshPendingNotes = useCallback(async () => {
    if (walletType !== 'para' || !accountId || isRefreshingRef.current) {
      return;
    }
    isRefreshingRef.current = true;
    try {
      const notes = await getConsumableNotes(accountId);
      const newCount = notes.length;

      // Detect if expected notes arrived
      if (lastKnownCountRef.current >= 0 && newCount > lastKnownCountRef.current) {
        const arrived = newCount - lastKnownCountRef.current;
        setExpectedNotesCount(c => Math.max(0, c - arrived));
      }
      lastKnownCountRef.current = newCount;
      setPendingNotesCount(newCount);
    } catch (e) {
      console.error('Failed to fetch pending notes count:', e);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [walletType, accountId, getConsumableNotes]);

  // Creates a new faucet
  const createFaucet = useCallback((params: FaucetParams) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    return withClientLock(async () => {
      console.log('Creating a new faucet.');
      const { symbol, decimals, initialSupply } = params;
      const faucet = await client.newFaucet(
        AccountStorageMode.public(),
        false,
        symbol,
        decimals,
        initialSupply,
        AuthScheme.AuthRpoFalcon512,
      );
      console.log('Created faucet ', faucet.bech32id());
      return faucet;
    });
  }, [client, withClientLock]);

  // Mints from a faucet account
  const mintFromFaucet = useCallback(
    (faucet_id: AccountId, account_id: AccountId, amount: bigint) => {
      if (!client) {
        throw new Error('Client not initialized');
      }
      return withClientLock(async () => {
        console.log(
          `Minting ${amount} from faucet ${accountIdToBech32(faucet_id)} to account ${
            accountIdToBech32(account_id)
          }.`,
        );
        const mintTxRequest = client.newMintTransactionRequest(
          account_id,
          faucet_id,
          NoteType.Public,
          amount,
        );
        const mintTxId = await client.submitNewTransaction(
          faucet_id,
          mintTxRequest,
        );
        await client.syncState();
        return mintTxId.toHex();
      });
    },
    [client, withClientLock],
  );

  const getAvailableTokens = useCallback(async () => {
    if (!client || !accountId) {
      return [];
    }
    return withClientLock(async () => {
      const acc = await client.getAccount(accountId);
      const tokens: { config: TokenConfig; amount: bigint }[] = [];
      for (const t of acc?.vault().fungibleAssets() ?? []) {
        const f = t.faucetId();
        const amount = t.amount();
        const faucet = await rpcClient.getAccountDetails(f);
        const account = faucet.account();
        if (account) {
          const faucet = BasicFungibleFaucetComponent.fromAccount(account);
          const symbol = faucet.symbol().toString();
          tokens.push({
            config: {
              symbol,
              decimals: faucet.decimals(),
              name: symbol,
              faucetId: f,
              faucetIdBech32: accountIdToBech32(f),
              oracleId: '0x',
            } as TokenConfig,
            amount,
          });
        }
      }
      return tokens;
    });
  }, [client, withClientLock, accountId, rpcClient]);

  // Periodic refresh for Para wallet users
  useEffect(() => {
    if (walletType !== 'para' || !accountId) {
      // Reset state when not Para wallet
      setPendingNotesCount(0);
      lastKnownCountRef.current = -1;
      return;
    }

    refreshPendingNotes();
    const interval = setInterval(refreshPendingNotes, 3000);
    return () => clearInterval(interval);
  }, [walletType, accountId, refreshPendingNotes]);

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
      getNoteStatus,
      getAccount,
      getBalance,
      getConsumableNotes,
      consumeNotes,
      client,
      rpcClient,
      // Notes tracking
      pendingNotesCount,
      isExpectingNotes,
      startExpectingNotes,
      refreshPendingNotes,
      createFaucet,
      mintFromFaucet,
      getAvailableTokens,
    };
  }, [
    accountId,
    poolsInfo,
    isPoolsInfoFetched,
    syncState,
    getNoteStatus,
    getAccount,
    getBalance,
    getConsumableNotes,
    consumeNotes,
    client,
    rpcClient,
    pendingNotesCount,
    isExpectingNotes,
    startExpectingNotes,
    refreshPendingNotes,
    createFaucet,
    mintFromFaucet,
    getAvailableTokens,
  ]);

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
