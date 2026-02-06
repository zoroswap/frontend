import { API } from '@/lib/config';
import { bech32ToAccountId } from '@/lib/utils';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface RawPoolInfo {
  decimals: number;
  faucet_id: string;
  name: string;
  oracle_id: string;
  symbol: string;
}
export interface PoolInfo {
  decimals: number;
  faucetId: AccountId;
  faucetIdBech32: string;
  name: string;
  oracleId: string;
  symbol: string;
}

export const usePoolsInfo = () => {
  const { data, refetch, isLoading, isFetched } = useQuery({
    queryKey: ['pool-info'],
    queryFn: fetchPoolInfo,
    staleTime: 3600000,
  });
  const value = useMemo(() => ({
    isLoading,
    isFetched,
    data: {
      poolAccountId: data?.pool_account_id,
      liquidityPools: data?.liquidity_pools.map(
        p => ({
          ...p,
          oracleId: p.oracle_id,
          faucetId: bech32ToAccountId(p.faucet_id),
          faucetIdBech32: p.faucet_id,
        } as PoolInfo),
      ),
    },
    refetch: refetch,
  }), [data?.liquidity_pools, data?.pool_account_id, refetch, isLoading, isFetched]);

  return value;
};

export interface PoolsInfo {
  poolAccountId: string;
  liquidityPools: PoolInfo[];
}

export interface PoolsResponse {
  pool_account_id: string;
  liquidity_pools: RawPoolInfo[];
}

export async function fetchPoolInfo() {
  try {
    const response = await fetch(`${API.endpoint}/pools/info`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch pool info: ${response.status} ${response.statusText}`,
      );
    }
    const data: PoolsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pool info:', error);
    throw error;
  }
}

export function findPoolBySymbol(
  pools: PoolInfo[],
  symbol: string,
): PoolInfo | undefined {
  return pools.find(pool => pool.symbol === symbol);
}
