import { REGISTRY_ACCOUNT } from '@/lib/config';
import { accountIdFromPrefixSuffix } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { AccountId, Word } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface XykPool {
  token0: AccountId;
  token1: AccountId;
  xykPoolId: AccountId;
}

export const useXykPools = () => {
  const { rpcClient } = useContext(ZoroContext);
  const [xykPools, setXykPools] = useState<XykPool[]>([]);

  const refetch = useCallback(async () => {
    try {
      if (!rpcClient || !REGISTRY_ACCOUNT) return;
      const xykPools: XykPool[] = [];
      const fetched = await rpcClient.getAccountDetails(REGISTRY_ACCOUNT);
      const storage = fetched.account()?.storage();

      const pools = storage?.getMapEntries('zoro::registry::assets_to_pool_mapping')
        ?? [];

      for (const pool of pools) {
        const key = pool.key;
        const value = pool.value;
        const keyword = Word.fromHex(key).toFelts();
        const valueword = Word.fromHex(value).toFelts();

        const token0 = accountIdFromPrefixSuffix(valueword[1], valueword[0]);
        const token1 = accountIdFromPrefixSuffix(valueword[3], valueword[2]);
        const xykPoolId = accountIdFromPrefixSuffix(keyword[1], keyword[0]);

        xykPools.push({ token0, token1, xykPoolId });
      }

      setXykPools(xykPools);
    } catch (e) {
      console.error(e);
    }
  }, [rpcClient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    const refresh = setInterval(refetch, 180000);
    return () => clearInterval(refresh);
  }, [refetch]);

  const value = useMemo(() => ({
    xykPools,
    refetch,
  }), [xykPools, refetch]);
  return value;
};
