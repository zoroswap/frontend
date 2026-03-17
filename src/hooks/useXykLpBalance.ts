import { ZoroContext } from '@/providers/ZoroContext';
import { Felt, Word } from '@miden-sdk/miden-sdk';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useContext, useEffect, useMemo } from 'react';

/**
 * Returns the user's LP share balance for a single XYK pool.
 * Reads from pool storage slot "zoro::lp_local::user_deposits_mapping"
 * with key = (accountId.prefix, accountId.suffix, 0, 0); value's first felt = LP shares.
 */
export function useXykLpBalance(poolId: string | undefined) {
  const { accountId } = useContext(ZoroContext);
  const { account, refetch, isLoading } = useAccountWithImport(poolId);

  const lpBalance = useMemo(() => {
    if (!poolId || !accountId || !account) return BigInt(0);
    try {
      const storage = account.storage();
      const key = Word.newFromFelts([
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
        new Felt(accountId.suffix().asInt()),
        new Felt(accountId.prefix().asInt()),
      ]);
      const value = storage?.getMapItem(
        'zoro::lp_local::user_deposits_mapping',
        key,
      )?.toFelts();
      return value?.[0] ? BigInt(value[0].asInt()) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [poolId, accountId, account]);

  useEffect(() => {
    const interval = setInterval(refetch, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  return useMemo(
    () => ({ lpBalance, refetch, isLoading }),
    [lpBalance, refetch, isLoading],
  );
}
