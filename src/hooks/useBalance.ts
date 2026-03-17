import { formalBigIntFormat, prettyBigintFormat } from '@/lib/format';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useContext, useEffect, useMemo } from 'react';

interface BalanceParams {
  token?: TokenConfig;
}

export const useBalance = ({ token }: BalanceParams) => {
  const { accountId } = useContext(ZoroContext);
  const accountIdStr = accountId?.toString();

  const { getBalance, refetch, error } = useAccountWithImport(accountIdStr ?? undefined);
  const faucetId = token?.faucetId?.toString();
  const isAccountNotFound =
    error?.message?.toLowerCase().includes('no account header') ?? false;

  const balance = useMemo(() => {
    if (!faucetId) return null;
    return getBalance(faucetId);
  }, [faucetId, getBalance]);

  useEffect(() => {
    if (!accountIdStr || isAccountNotFound) return;
    const t = setInterval(refetch, 15000);
    return () => clearInterval(t);
  }, [refetch, accountIdStr, isAccountNotFound]);

  return useMemo(() => ({
    balance,
    refetch,
    accountError: isAccountNotFound ? error : undefined,
    formatted: prettyBigintFormat({
      value: balance ?? undefined,
      expo: token?.decimals || 0,
    }),
    formattedLong: formalBigIntFormat({
      val: balance ?? undefined,
      expo: token?.decimals || 0,
    }),
  }), [balance, refetch, token, isAccountNotFound, error]);
};
