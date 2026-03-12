import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, bech32ToAccountId } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { BasicFungibleFaucetComponent } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Fetches token metadata from the network for the given faucet IDs.
 * Converts each faucet account to TokenConfig the same way as getAvailableTokens in ZoroProvider.
 * Returns tokens keyed by faucetIdBech32.
 */
export function useTokens(faucetIds: string[] | undefined) {
  const { rpcClient } = useContext(ZoroContext);
  const [tokens, setTokens] = useState<Record<string, TokenConfig>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!rpcClient || !faucetIds?.length) {
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
          const details = await rpcClient.getAccountDetails(faucetId);
          const account = details.account();
          if (!account) continue;
          const faucet = BasicFungibleFaucetComponent.fromAccount(account);
          const symbol = faucet.symbol().toString();
          result[accountIdToBech32(faucetId)] = {
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
      setTokens(result);
    } finally {
      setLoading(false);
    }
  }, [rpcClient, faucetIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ tokens, loading, refresh }), [tokens, loading, refresh]);
}
