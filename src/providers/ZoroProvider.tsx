import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { bech32ToAccountId, instantiateClient } from '@/lib/utils';
import { AccountId, Address, WebClient } from '@demox-labs/miden-sdk';
import { useWallet } from '@demox-labs/miden-wallet-adapter';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZoroContext } from './ZoroContext';

enum ClientState {
  NOT_INITIALIZED,
  IDLE,
  ACTIVE,
}

export function ZoroProvider({
  children,
}: { children: ReactNode }) {
  const { data: poolsInfo, isFetched: isPoolsInfoFetched } = usePoolsInfo();
  const { address } = useWallet();
  const accountId = useMemo(
    () => address ? Address.fromBech32(address).accountId() : undefined,
    [address],
  );
  const [client, setClient] = useState<WebClient | undefined>(undefined);
  const clientState = useRef<ClientState>(ClientState.NOT_INITIALIZED);

  useEffect(() => {
    if (client || !accountId || !poolsInfo) {
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
      setClient(c);
      clientState.current = ClientState.IDLE;
    })();
  }, [poolsInfo, accountId, client, setClient]);

  const syncState = useCallback(async () => {
    if (clientState.current === ClientState.NOT_INITIALIZED) {
      return;
    }
    if (clientState.current === ClientState.ACTIVE) {
      while (clientState.current === ClientState.ACTIVE) {
        await new Promise(p => setTimeout(p, 50));
      }
      clientState.current = ClientState.ACTIVE;
      client?.syncState().then();
      clientState.current = ClientState.IDLE;
    } else if (clientState.current === ClientState.IDLE) {
      clientState.current = ClientState.ACTIVE;
      await client?.syncState();
      clientState.current = ClientState.IDLE;
    }
  }, [client]);

  const getAccount = useCallback(async (accountId: AccountId) => {
    if (clientState.current === ClientState.NOT_INITIALIZED) {
      return;
    }
    if (clientState.current === ClientState.ACTIVE) {
      while (clientState.current === ClientState.ACTIVE) {
        await new Promise(p => setTimeout(p, 50));
      }
      clientState.current = ClientState.ACTIVE;
      const acc = client?.getAccount(accountId);
      clientState.current = ClientState.IDLE;
      return acc;
    } else if (clientState.current === ClientState.IDLE) {
      clientState.current = ClientState.ACTIVE;
      await client?.syncState();
      const acc = await client?.getAccount(accountId);
      clientState.current = ClientState.IDLE;
      return acc;
    }
  }, [client]);

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
    };
  }, [accountId, poolsInfo, isPoolsInfoFetched, syncState, getAccount, client]);

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
