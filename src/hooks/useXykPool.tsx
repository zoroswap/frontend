import {
  accountIdFromPrefixSuffix,
  accountIdToBech32,
  bech32ToAccountId,
} from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import {
  AccountId,
  BasicFungibleFaucetComponent,
  Felt,
  Word,
} from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
  const { rpcClient } = useContext(ZoroContext);
  const [data, setData] = useState<XykPoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!poolId || !rpcClient) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const poolAccountId = bech32ToAccountId(poolId);
      if (!poolAccountId) {
        setData(null);
        return;
      }
      const fetched = await rpcClient.getAccountDetails(
        bech32ToAccountId(accountIdToBech32(poolAccountId))!,
      );
      const account = fetched.account();
      const storage = account?.storage();
      if (!storage) {
        setData(null);
        return;
      }

      const assetsKey = Word.newFromFelts([
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
      ]);
      const assetsValue = storage.getMapItem(
        'zoro::lp_local::assets_mapping',
        assetsKey,
      );
      if (!assetsValue) {
        setData(null);
        return;
      }
      const felts = assetsValue.toFelts();
      if (felts.length < 4) {
        setData(null);
        return;
      }

      const token0Id = accountIdFromPrefixSuffix(
        felts[1],
        felts[0],
      );
      const token1Id = accountIdFromPrefixSuffix(
        felts[3],
        felts[2],
      );

      const totalSupplyWord = storage.getItem('zoro::lp_local::total_supply');
      const totalSupplyFelts = totalSupplyWord?.toFelts() ?? [];
      const totalSupply = totalSupplyFelts[0]?.asInt() ?? BigInt(0);

      const reserveWord = storage.getItem('zoro::lp_local::reserve');
      const reserveFelts = reserveWord?.toFelts() ?? [];
      const reserve0 = reserveFelts[0]?.asInt() ?? BigInt(0);
      const reserve1 = reserveFelts[1]?.asInt() ?? BigInt(0);

      const fetchFaucetInfo = async (
        faucetId: AccountId,
      ): Promise<XykTokenInfo> => {
        const details = await rpcClient.getAccountDetails(
          bech32ToAccountId(accountIdToBech32(faucetId))!,
        );
        const acc = details.account();
        if (!acc) {
          return {
            symbol: '???',
            decimals: 18,
            name: 'Unknown',
            faucetId,
            faucetIdBech32: accountIdToBech32(faucetId),
          };
        }
        const faucet = BasicFungibleFaucetComponent.fromAccount(acc);
        const symbol = faucet.symbol().toString();
        return {
          symbol,
          decimals: faucet.decimals(),
          name: symbol,
          faucetId,
          faucetIdBech32: accountIdToBech32(faucetId),
        };
      };

      const [token0, token1] = await Promise.all([
        fetchFaucetInfo(token0Id),
        fetchFaucetInfo(token1Id),
      ]);

      const priceToken0InToken1 = reserve1 > 0n
        ? Number(reserve1) / 10 ** token1.decimals
          / (Number(reserve0) / 10 ** token0.decimals)
        : 0;

      setData({
        token0,
        token1,
        totalSupply,
        reserve0,
        reserve1,
        priceToken0InToken1,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, rpcClient]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch,
    }),
    [data, isLoading, error, refetch],
  );
}
