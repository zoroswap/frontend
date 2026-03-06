import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext, useMemo, useState } from 'react';

interface FaucetParams {
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

const useLaunchpad = () => {
  const [error, setError] = useState<string>('');
  const { accountId, createFaucet, mintFromFaucet } = useContext(ZoroContext);
  const launchToken = useCallback(async (params: FaucetParams) => {
    try {
      if (!accountId) {
        throw new Error('User must be logged in to use the launchpad');
      }
      const faucet = await createFaucet(params);
      if (faucet && accountId) {
        const txId = await mintFromFaucet(faucet.id(), accountId, params.initialSupply);
        return txId;
      } else throw new Error('Faucet failed creating');
    } catch (e) {
      console.log(e);
      if (typeof e?.toString === 'function') {
        setError(e.toString());
      } else {
        setError('Error on launching token, check console for more details.');
      }
    }
  }, [createFaucet, setError, mintFromFaucet, accountId]);

  const value = useMemo(() => ({
    launchToken,
    error,
  }), [launchToken, error]);
  return value;
};

export default useLaunchpad;
