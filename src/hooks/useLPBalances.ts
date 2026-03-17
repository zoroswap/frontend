import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { Felt, Word } from '@miden-sdk/miden-sdk';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useContext, useEffect, useMemo } from 'react';
import { accountIdToBech32 } from '@/lib/utils';

export const useLPBalances = ({ tokens }: { tokens?: TokenConfig[] }) => {
  const { poolAccountId, accountId } = useContext(ZoroContext);
  const poolAccountIdStr = poolAccountId ? accountIdToBech32(poolAccountId) : undefined;
  const { account, refetch } = useAccountWithImport(poolAccountIdStr);

  const balances = useMemo(() => {
    const out: Record<string, bigint> = {};
    if (!poolAccountId || !accountId || !account || !tokens?.length) return out;
    try {
      const storage = account.storage();
      for (const token of tokens) {
        const lp = storage?.getMapItem(
          'zoroswap::user_deposits',
          Word.newFromFelts([
            new Felt(accountId.suffix().asInt()),
            new Felt(accountId.prefix().asInt()),
            new Felt(token.faucetId.suffix().asInt()),
            new Felt(token.faucetId.prefix().asInt()),
          ]),
        )?.toFelts();
        const balance = BigInt(lp?.[0].asInt() ?? 0);
        out[token.faucetIdBech32] = balance;
      }
    } catch {
      // ignore
    }
    return out;
  }, [poolAccountId, accountId, account, tokens]);

  useEffect(() => {
    const t = setInterval(refetch, 10000);
    return () => clearInterval(t);
  }, [refetch]);

  return useMemo(() => ({ balances, refetch }), [balances, refetch]);
};
