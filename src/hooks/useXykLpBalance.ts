import { bech32ToAccountId, accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { Felt, Word } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Returns the user's LP share balance for a single XYK pool.
 * Reads from pool storage slot "zoro::lp_local::user_deposits_mapping"
 * with key = (accountId.prefix, accountId.suffix, 0, 0); value's first felt = LP shares.
 */
export function useXykLpBalance(poolId: string | undefined) {
  const { rpcClient, accountId } = useContext(ZoroContext);
  const [lpBalance, setLpBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!poolId || !rpcClient || !accountId) {
      setLpBalance(BigInt(0));
      return;
    }
    setIsLoading(true);
    try {
      const poolIdClone = bech32ToAccountId(poolId);
      if (!poolIdClone) {
        setLpBalance(BigInt(0));
        return;
      }
      const fetched = await rpcClient.getAccountDetails(
        bech32ToAccountId(accountIdToBech32(poolIdClone))!,
      );
      const storage = fetched.account()?.storage();
      const key = Word.newFromFelts([
        new Felt(accountId.prefix().asInt()),
        new Felt(accountId.suffix().asInt()),
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
      ]);
      const value = storage?.getMapItem(
        'zoro::lp_local::user_deposits_mapping',
        key,
      )?.toFelts();
      const balance = value?.[0] ? BigInt(value[0].asInt()) : BigInt(0);
      setLpBalance(balance);
    } catch {
      setLpBalance(BigInt(0));
    } finally {
      setIsLoading(false);
    }
  }, [poolId, rpcClient, accountId]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  return useMemo(
    () => ({ lpBalance, refetch, isLoading }),
    [lpBalance, refetch, isLoading],
  );
}
