import { type TokenConfigWithBalance, ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

const useTokensWithBalance = () => {
  const { getAvailableTokens, accountId } = useContext(ZoroContext);
  const [tokensWithBalance, setTokensWithBalance] = useState<
    TokenConfigWithBalance[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const tokens = await getAvailableTokens();
    console.log(tokens);
    setTokensWithBalance(tokens);
    setLoading(false);
  }, [getAvailableTokens]);

  const metadata = useMemo(() => {
    return tokensWithBalance.reduce((acc, t) => {
      return { ...acc, [t.config.faucetIdBech32]: t.config };
    }, {} as Record<string, TokenConfig>);
  }, [tokensWithBalance]);

  useEffect(() => {
    if (accountId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      refresh();
    }
  }, [refresh, accountId]);

  return { tokensWithBalance, loading, metadata };
};

export default useTokensWithBalance;
