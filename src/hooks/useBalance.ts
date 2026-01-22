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
  const { accountId, getBalance } = useContext(ZoroContext);
  const [balance, setBalance] = useState<bigint | null>(null);
  const faucetId = token?.faucetId;

  const refetch = useCallback(async () => {
    if (!accountId || !faucetId) return;
    const newBalance = await getBalance(accountId, faucetId);
    setBalance(newBalance);
  }, [accountId, faucetId, getBalance]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
