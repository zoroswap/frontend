import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { Felt, Word } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const useLPBalances = ({ tokens }: { tokens?: TokenConfig[] }) => {
  const { rpcClient, poolAccountId, accountId } = useContext(ZoroContext);
  const [balances, setBalances] = useState<Record<string, bigint>>({});

  const refetch = useCallback(async () => {
    if (!poolAccountId || !rpcClient || !accountId || !tokens) return;
    const balances: Record<string, bigint> = {};
    const fetched = await rpcClient.getAccountDetails(poolAccountId);
    const storage = fetched.account()?.storage();
    for (const token of tokens) {
      const lp = storage?.getMapItem(
        "zoroswap::user_deposits",
        Word.newFromFelts([
          new Felt(accountId.suffix().asInt()),
          new Felt(accountId.prefix().asInt()),
          new Felt(token.faucetId.suffix().asInt()),
          new Felt(token.faucetId.prefix().asInt()),
        ]),
      )?.toFelts();
      const balance = BigInt(lp?.[0].asInt() || BigInt(0)) ?? BigInt(0);
      balances[token.faucetIdBech32] = balance;
    }
    setBalances(balances);
  }, [poolAccountId, rpcClient, accountId, tokens]);

  useEffect(() => {
    // eslint-disable-next-line
    refetch();
    const refresh = setInterval(refetch, 10000);
    return () => clearInterval(refresh);
  }, [refetch]);

  const value = useMemo(() => ({
    balances,
    refetch,
  }), [balances, refetch]);
  return value;
};
