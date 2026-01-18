import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { formalBigIntFormat, prettyBigintFormat } from '@/utils/format';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface BalanceParams {
  token?: TokenConfig;
}

export const useBalance = (
  { token }: BalanceParams,
) => {
  const { client, accountId, withClientLock, syncState } = useContext(ZoroContext);
  const [balance, setBalance] = useState<bigint | null>(null);
  const faucetId = token?.faucetId;

  const refetch = useCallback(async () => {
    if (!accountId || !faucetId || !client) return;

    // Use throttled syncState from context
    await syncState();
    const newBalance = await withClientLock(async () => {
      const acc = await client.getAccount(accountId);
      return acc?.vault().getBalance(faucetId);
    });
    setBalance(BigInt(newBalance ?? 0));
  }, [accountId, client, faucetId, withClientLock, syncState]);

  useEffect(() => {
    refetch();
    const clear = setInterval(refetch, 3000);
    return () => clearInterval(clear);
  }, [refetch]);

  const value = useMemo(() => ({
    balance,
    refetch,
    formatted: prettyBigintFormat({
      value: balance || undefined,
      expo: token?.decimals || 0,
    }),
    formattedLong: formalBigIntFormat({
      val: balance || undefined,
      expo: token?.decimals || 0,
    }),
  }), [
    balance,
    refetch,
    token,
  ]);

  return value;
};
