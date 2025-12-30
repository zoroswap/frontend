import { API } from '@/lib/config';
import { bech32ToAccountId } from '@/lib/utils';
import type { AccountId } from '@demox-labs/miden-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface PoolBalance {
  totalLiabilities: bigint;
  reserve: bigint;
  reserveWithSlippage: bigint;
  faucetId: AccountId;
  faucetIdBech32: string;
}

export interface RawPoolBalance {
  total_liabilities: string;
  reserve: string;
  reserve_with_slippage: string;
  faucet_id: string;
}

export const usePoolsBalances = () => {
  const { data, refetch } = useQuery({
    queryKey: ['pools-balances'],
    queryFn: fetchPoolBalance,
    staleTime: 15000,
  });
  const value = useMemo(() => ({
    data: data?.data.map(
      p => ({
        faucetId: bech32ToAccountId(p.faucet_id),
        faucetIdBech32: p.faucet_id,
        totalLiabilities: BigInt(p.total_liabilities ?? 0),
        reserve: BigInt(p.reserve ?? 0),
        reserveWithSlippage: BigInt(p.reserve_with_slippage ?? 0),
      } as PoolBalance),
    ),
    refetch,
  }), [data, refetch]);
  return value;
};

export interface PoolsInfo {
  poolAccountId: string;
  liquidityPools: PoolBalance;
}

export interface PoolBalancesResponse {
  data: RawPoolBalance[];
}

export async function fetchPoolBalance() {
  try {
    const response = await fetch(`${API.endpoint}/pools/balance`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch pool balances: ${response.status} ${response.statusText}`,
      );
    }
    const data: PoolBalancesResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pool balances:', error);
    throw error;
  }
}
