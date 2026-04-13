import { ZoroContext } from '@/providers/ZoroContext';
import type { SlotMapItemResult } from '@/workers/rpcWorkerTypes';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

/**
 * Returns the user's LP share balance for a single XYK pool.
 * Reads from pool storage slot "zoro::lp_local::user_deposits_mapping"
 * with key = (0, 0, accountId.suffix, accountId.prefix); value's first felt = LP shares.
 */
export function useXykLpBalance(poolId: string | undefined) {
  const { accountId } = useContext(ZoroContext);
  const { getAccountStorage } = useRpcWorker();
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!poolId || !accountId) {
      setLpBalance(0n);
      return;
    }
    setIsLoading(true);
    try {
      const results = await getAccountStorage(poolId, [{
        kind: 'mapItem',
        slotName: 'zoro::lp_local::user_deposits_mapping',
        key: [
          '0',
          '0',
          accountId.suffix().asInt().toString(),
          accountId.prefix().asInt().toString(),
        ],
      }]);
      const word = (results[0] as SlotMapItemResult).value;
      setLpBalance(word ? BigInt(word[0]) : 0n);
    } catch {
      setLpBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, accountId, getAccountStorage]);

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
