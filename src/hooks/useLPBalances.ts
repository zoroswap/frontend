import { accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import type { SerializedWord } from '@/workers/rpcWorkerTypes';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRpcWorker } from './useRpcWorker';

export const useLPBalances = ({ tokens }: { tokens?: TokenConfig[] }) => {
  const { poolAccountId, accountId } = useContext(ZoroContext);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const { getStorageMapItem } = useRpcWorker();

  const refetch = useCallback(async () => {
    if (!poolAccountId || !accountId || !tokens) return;

    const poolBech32 = accountIdToBech32(poolAccountId);
    const accSuffix = accountId.suffix().asInt().toString();
    const accPrefix = accountId.prefix().asInt().toString();
    const newBalances: Record<string, bigint> = {};

    for (const token of tokens) {
      const key: SerializedWord = [
        accSuffix,
        accPrefix,
        token.faucetId.suffix().asInt().toString(),
        token.faucetId.prefix().asInt().toString(),
      ];
      const result = await getStorageMapItem(poolBech32, 'zoroswap::user_deposits', key);
      newBalances[token.faucetIdBech32] = result ? BigInt(result[0]) : 0n;
    }
    setBalances(newBalances);
  }, [poolAccountId, accountId, tokens, getStorageMapItem]);

  useEffect(() => {
    refetch();
    const refresh = setInterval(refetch, 180000);
    return () => clearInterval(refresh);
  }, [refetch]);

  return useMemo(() => ({ balances, refetch }), [balances, refetch]);
};
