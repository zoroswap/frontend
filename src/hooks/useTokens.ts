import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, bech32ToAccountId } from '@/lib/utils';
import { BasicFungibleFaucetComponent } from '@miden-sdk/miden-sdk';
import { useMiden } from '@miden-sdk/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Fetches token metadata from the network for the given faucet IDs.
 * Uses the Miden client (useMiden) to get account details.
 * Returns tokens keyed by faucetIdBech32.
 */
export function useTokens(faucetIds: string[] | undefined) {
  const { client, isReady, runExclusive } = useMiden();
  const [tokens, setTokens] = useState<Record<string, TokenConfig>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!client || !isReady || !faucetIds?.length) {
      setTokens({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await (runExclusive ?? ((fn: () => Promise<Record<string, TokenConfig>>) => fn()))(async () => {
        const out: Record<string, TokenConfig> = {};
        for (const bech32 of faucetIds) {
          const faucetId = bech32ToAccountId(bech32);
          if (!faucetId) continue;
          try {
            const account = await client.getAccount(faucetId);
            if (!account) continue;
            const faucet = BasicFungibleFaucetComponent.fromAccount(account);
            const symbol = faucet.symbol().toString();
            out[accountIdToBech32(faucetId)] = {
              symbol,
              decimals: faucet.decimals(),
              name: symbol,
              faucetId,
              faucetIdBech32: accountIdToBech32(faucetId),
              oracleId: '0x',
            };
          } catch {
            // skip failed faucet
          }
        }
        return out;
      });
      setTokens(result ?? {});
    } finally {
      setLoading(false);
    }
  }, [client, isReady, runExclusive, faucetIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ tokens, loading, refresh }), [tokens, loading, refresh]);
}
