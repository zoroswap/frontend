import { accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext, useMemo, useState } from 'react';

export interface FaucetParams {
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

export interface LaunchSuccess {
  txId: string;
  faucetIdBech32: string;
}

const MIDENSCAN_BASE = 'https://testnet.midenscan.com';

export function getMidenscanTxUrl(txId: string): string {
  return `${MIDENSCAN_BASE}/tx/${txId}`;
}

export function getMidenscanAccountUrl(accountBech32: string): string {
  return `${MIDENSCAN_BASE}/account/${accountBech32}`;
}

const useLaunchpad = () => {
  const [error, setError] = useState<string>('');
  const { accountId, createFaucet, mintFromFaucet } = useContext(ZoroContext);

  const clearError = useCallback(() => setError(''), []);

  const launchToken = useCallback(async (params: FaucetParams): Promise<LaunchSuccess | undefined> => {
    setError('');
    try {
      if (!accountId) {
        throw new Error('Connect your wallet to use the launchpad');
      }
      const faucet = await createFaucet(params);
      if (!faucet) {
        throw new Error('Faucet creation failed');
      }
      const faucetIdBech32 = accountIdToBech32(faucet.id());
      const txId = await mintFromFaucet(faucet.id(), accountId, params.initialSupply);
      return { txId, faucetIdBech32 };
    } catch (e) {
      const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Launch failed. Check the console for details.';
      setError(message);
      console.error('Launchpad error:', e);
      return undefined;
    }
  }, [accountId, createFaucet, mintFromFaucet]);

  const value = useMemo(() => ({
    launchToken,
    error,
    clearError,
  }), [launchToken, error, clearError]);
  return value;
};

export default useLaunchpad;
