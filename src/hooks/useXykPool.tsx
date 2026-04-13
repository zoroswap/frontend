import { accountIdFromPrefixSuffix, accountIdToBech32 } from '@/lib/utils';
import type { SlotItemResult, SlotMapItemResult } from '@/workers/rpcWorkerTypes';
import { AccountId, Felt } from '@miden-sdk/miden-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

export interface XykTokenInfo {
  symbol: string;
  decimals: number;
  name: string;
  faucetId: AccountId;
  faucetIdBech32: string;
}

export interface XykPoolData {
  token0: XykTokenInfo;
  token1: XykTokenInfo;
  totalSupply: bigint;
  reserve0: bigint;
  reserve1: bigint;
  priceToken0InToken1: number;
}

export function useXykPool(poolId: string | undefined) {
  const { getAccountStorage, getFaucetInfo } = useRpcWorker();
  const [data, setData] = useState<XykPoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!poolId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const results = await getAccountStorage(poolId, [
        {
          kind: 'mapItem',
          slotName: 'zoro::lp_local::assets_mapping',
          key: ['0', '0', '0', '0'],
        },
        { kind: 'item', slotName: 'zoro::lp_local::total_supply' },
        { kind: 'item', slotName: 'zoro::lp_local::reserve' },
      ]);

      const assetsWord = (results[0] as SlotMapItemResult).value;
      if (!assetsWord) {
        setData(null);
        return;
      }

      const token0Id = accountIdFromPrefixSuffix(
        new Felt(BigInt(assetsWord[1])),
        new Felt(BigInt(assetsWord[0])),
      );
      const token1Id = accountIdFromPrefixSuffix(
        new Felt(BigInt(assetsWord[3])),
        new Felt(BigInt(assetsWord[2])),
      );

      const totalSupplyWord = (results[1] as SlotItemResult).value;
      const reserveWord = (results[2] as SlotItemResult).value;
      const totalSupply = totalSupplyWord ? BigInt(totalSupplyWord[0]) : 0n;
      const reserve0 = reserveWord ? BigInt(reserveWord[0]) : 0n;
      const reserve1 = reserveWord ? BigInt(reserveWord[1]) : 0n;

      const fetchTokenInfo = async (faucetId: AccountId): Promise<XykTokenInfo> => {
        const bech32 = accountIdToBech32(faucetId);
        const info = await getFaucetInfo(bech32);
        if (!info) {
          return {
            symbol: '???',
            decimals: 18,
            name: 'Unknown',
            faucetId,
            faucetIdBech32: bech32,
          };
        }
        return {
          symbol: info.symbol,
          decimals: info.decimals,
          name: info.symbol,
          faucetId,
          faucetIdBech32: bech32,
        };
      };

      const [token0, token1] = await Promise.all([
        fetchTokenInfo(token0Id),
        fetchTokenInfo(token1Id),
      ]);

      const priceToken0InToken1 = reserve1 > 0n
        ? Number(reserve1) / 10 ** token1.decimals
          / (Number(reserve0) / 10 ** token0.decimals)
        : 0;

      setData({ token0, token1, totalSupply, reserve0, reserve1, priceToken0InToken1 });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, getAccountStorage, getFaucetInfo]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return useMemo(
    () => ({ data, isLoading, error, refetch }),
    [data, isLoading, error, refetch],
  );
}
