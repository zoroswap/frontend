import { XYK_REGISTRY_BECH32 } from '@/lib/config';
import { accountIdFromPrefixSuffix } from '@/lib/utils';
import type { SlotMapEntriesResult } from '@/workers/rpcWorkerTypes';
import { AccountId, Word } from '@miden-sdk/miden-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

export interface XykPool {
  token0: AccountId;
  token1: AccountId;
  xykPoolId: AccountId;
}

export const useXykPools = () => {
  const { getAccountStorage } = useRpcWorker();
  const [xykPools, setXykPools] = useState<XykPool[]>([]);

  const refetch = useCallback(async () => {
    try {
      if (!XYK_REGISTRY_BECH32) return;

      const results = await getAccountStorage(XYK_REGISTRY_BECH32, [
        { kind: 'mapEntries', slotName: 'zoro::registry::assets_to_pool_mapping' },
      ]);

      const entries = (results[0] as SlotMapEntriesResult).entries;
      const pools: XykPool[] = [];

      for (const entry of entries) {
        const keyword = Word.fromHex(entry.key).toFelts();
        const valueword = Word.fromHex(entry.value).toFelts();

        const token0 = accountIdFromPrefixSuffix(valueword[1], valueword[0]);
        const token1 = accountIdFromPrefixSuffix(valueword[3], valueword[2]);
        const xykPoolId = accountIdFromPrefixSuffix(keyword[1], keyword[0]);

        pools.push({ token0, token1, xykPoolId });
      }

      setXykPools(pools);
    } catch (e) {
      console.error(e);
    }
  }, [getAccountStorage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    const refresh = setInterval(refetch, 60000);
    return () => clearInterval(refresh);
  }, [refetch]);

  return useMemo(() => ({ xykPools, refetch }), [xykPools, refetch]);
};
