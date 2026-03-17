import { accountIdToBech32 } from '@/lib/utils';
import { type TokenConfigWithBalance } from '@/providers/ZoroContext';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { AccountId } from '@miden-sdk/miden-sdk';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useContext, useMemo } from 'react';

export default function useTokensWithBalance() {
  const { accountId } = useContext(ZoroContext);
  const accountIdStr = accountId?.toString();
  const { assets, isLoading } = useAccountWithImport(accountIdStr);

  const tokensWithBalance = useMemo((): TokenConfigWithBalance[] => {
    return assets.map(a => {
      const id = a.assetId.startsWith('0x') ? AccountId.fromHex(a.assetId) : AccountId.fromHex('0x' + a.assetId);
      return {
        config: {
          symbol: a.symbol ?? '',
          name: a.symbol ?? '',
          decimals: a.decimals ?? 8,
          faucetId: id,
          faucetIdBech32: accountIdToBech32(id),
          oracleId: '0x',
        } as TokenConfig,
        amount: a.amount,
      };
    });
  }, [assets]);

  const metadata = useMemo(() => {
    return tokensWithBalance.reduce((acc, t) => {
      acc[t.config.faucetIdBech32] = t.config;
      return acc;
    }, {} as Record<string, TokenConfig>);
  }, [tokensWithBalance]);

  return { tokensWithBalance, loading: isLoading, metadata };
}
