import { REGISTRY_ACCOUNT } from '@/lib/config';
import { accountIdFromPrefixSuffix } from '@/lib/utils';
import { AccountId, Word } from '@miden-sdk/miden-sdk';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useEffect, useMemo } from 'react';

export interface XykPool {
  token0: AccountId;
  token1: AccountId;
  xykPoolId: AccountId;
}

export const useXykPools = () => {
  const registryAccountIdStr = REGISTRY_ACCOUNT?.toString();
  const { account, refetch } = useAccountWithImport(registryAccountIdStr);

  const xykPools = useMemo((): XykPool[] => {
    if (!account) return [];
    try {
      const storage = account.storage();
      const pools = storage?.getMapEntries('zoro::registry::assets_to_pool_mapping') ?? [];
      const result: XykPool[] = [];
      for (const pool of pools) {
        const key = pool.key;
        const value = pool.value;
        const keyword = Word.fromHex(key).toFelts();
        const valueword = Word.fromHex(value).toFelts();
        const token0 = accountIdFromPrefixSuffix(valueword[1], valueword[0]);
        const token1 = accountIdFromPrefixSuffix(valueword[3], valueword[2]);
        const xykPoolId = accountIdFromPrefixSuffix(keyword[1], keyword[0]);
        result.push({ token0, token1, xykPoolId });
      }
      return result;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [account]);

  useEffect(() => {
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
  }, [refetch]);

  return useMemo(() => ({ xykPools, refetch }), [xykPools, refetch]);
};
