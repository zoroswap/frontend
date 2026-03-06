import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useCallback, useContext, useEffect, useState } from 'react';

/**
 * Returns tokens from context that the user has a balance for (balance > 0).
 * Used to drive token selects that only show assets the user holds.
 */
export function useTokensWithBalance(): {
  tokensWithBalance: TokenConfig[];
  loading: boolean;
} {
  const { accountId, getBalance, tokens } = useContext(ZoroContext);
  const [tokensWithBalance, setTokensWithBalance] = useState<TokenConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = Object.values(tokens);
    if (!accountId || list.length === 0) {
      setTokensWithBalance([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const withBalances = await Promise.all(
        list.map(async (t) => {
          const balance = await getBalance(accountId, t.faucetId);
          return { token: t, balance };
        }),
      );
      const filtered = withBalances
        .filter(({ balance }) => balance > 0n)
        .map(({ token }) => token);
      setTokensWithBalance(filtered);
    } catch (e) {
      console.error('useTokensWithBalance:', e);
      setTokensWithBalance([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, getBalance, tokens]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tokensWithBalance, loading };
}
