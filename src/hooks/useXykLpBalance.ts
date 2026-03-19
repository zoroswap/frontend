import { ZoroContext } from '@/providers/ZoroContext';
import type { SerializedWord } from '@/workers/rpcWorkerTypes';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

/**
 * Returns the user's LP share balance for a single XYK pool.
 * Reads from pool storage slot "zoro::lp_local::user_deposits_mapping"
 * with key = (0, 0, accountId.suffix, accountId.prefix); value's first felt = LP shares.
 */
export function useXykLpBalance(poolId: string | undefined) {
  const { accountId } = useContext(ZoroContext);
  const { getStorageMapItem } = useRpcWorker();
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!poolId || !accountId) {
      setLpBalance(0n);
      return;
    }
    setIsLoading(true);
    try {
      const key: SerializedWord = [
        '0',
        '0',
        accountId.suffix().asInt().toString(),
        accountId.prefix().asInt().toString(),
      ];
      const result = await getStorageMapItem(poolId, 'zoro::lp_local::user_deposits_mapping', key);
      setLpBalance(result ? BigInt(result[0]) : 0n);
    } catch {
      setLpBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, accountId, getStorageMapItem]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 180000);
    return () => clearInterval(interval);
  }, [refetch]);

  return useMemo(
    () => ({ lpBalance, refetch, isLoading }),
    [lpBalance, refetch, isLoading],
  );
}
