import type { TokenConfig } from '@/providers/ZoroProvider';
import { bech32ToAccountId } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

/**
 * Fetches token metadata from the network for the given faucet IDs.
 * Returns tokens keyed by faucetIdBech32.
 */
export function useTokens(faucetIds: string[] | undefined) {
  const { getFaucetInfo } = useRpcWorker();
  const [tokens, setTokens] = useState<Record<string, TokenConfig>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!faucetIds?.length) {
      setTokens({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result: Record<string, TokenConfig> = {};
      for (const bech32 of faucetIds) {
        const faucetId = bech32ToAccountId(bech32);
        if (!faucetId) continue;
        try {
          const info = await getFaucetInfo(bech32);
          if (!info) continue;
          result[bech32] = {
            symbol: info.symbol,
            decimals: info.decimals,
            name: info.symbol,
            faucetId,
            faucetIdBech32: bech32,
            oracleId: '0x',
          };
        } catch {
          // skip failed faucet
        }
      }
      setTokens(result);
    } finally {
      setLoading(false);
    }
  }, [faucetIds, getFaucetInfo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ tokens, loading, refresh }), [tokens, loading, refresh]);
}
