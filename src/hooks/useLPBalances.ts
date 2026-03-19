import { accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import type { SlotMapItemResult, SlotQuery } from '@/workers/rpcWorkerTypes';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

export const useLPBalances = ({ tokens }: { tokens?: TokenConfig[] }) => {
  const { poolAccountId, accountId } = useContext(ZoroContext);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const { getAccountStorage } = useRpcWorker();

  const refetch = useCallback(async () => {
    if (!poolAccountId || !accountId || !tokens?.length) return;

    const poolBech32 = accountIdToBech32(poolAccountId);
    const accSuffix = accountId.suffix().asInt().toString();
    const accPrefix = accountId.prefix().asInt().toString();

    const queries: SlotQuery[] = tokens.map((token) => ({
      kind: 'mapItem' as const,
      slotName: 'zoroswap::user_deposits',
      key: [
        accSuffix,
        accPrefix,
        token.faucetId.suffix().asInt().toString(),
        token.faucetId.prefix().asInt().toString(),
      ] as [string, string, string, string],
    }));

    const results = await getAccountStorage(poolBech32, queries);
    const newBalances: Record<string, bigint> = {};
    for (let i = 0; i < tokens.length; i++) {
      const word = (results[i] as SlotMapItemResult).value;
      newBalances[tokens[i].faucetIdBech32] = word ? BigInt(word[0]) : 0n;
    }
    setBalances(newBalances);
  }, [poolAccountId, accountId, tokens, getAccountStorage]);

  useEffect(() => {
    refetch();
    const refresh = setInterval(refetch, 180000);
    return () => clearInterval(refresh);
  }, [refetch]);

  return useMemo(() => ({ balances, refetch }), [balances, refetch]);
};
