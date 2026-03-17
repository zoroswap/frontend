import {
  accountIdFromPrefixSuffix,
  accountIdToBech32,
} from '@/lib/utils';
import {
  AccountId,
  BasicFungibleFaucetComponent,
  Felt,
  Word,
} from '@miden-sdk/miden-sdk';
import { useAccountWithImport } from '@/hooks/useAccountWithImport';
import { useMemo } from 'react';

export interface XykTokenInfo {
  symbol: string;
  decimals: number;
  name: string;
  faucetId: AccountId;
  faucetIdBech32: string;
}

export interface XykPoolData {
  token0: XykTokenInfo;
  token1: XykTokenInfo;
  totalSupply: bigint;
  reserve0: bigint;
  reserve1: bigint;
  priceToken0InToken1: number;
}

function tokenInfoFromAccount(faucetId: AccountId, account: import('@miden-sdk/miden-sdk').Account | null): XykTokenInfo {
  if (!account) {
    return {
      symbol: '???',
      decimals: 18,
      name: 'Unknown',
      faucetId,
      faucetIdBech32: accountIdToBech32(faucetId),
    };
  }
  const faucet = BasicFungibleFaucetComponent.fromAccount(account);
  const symbol = faucet.symbol().toString();
  return {
    symbol,
    decimals: faucet.decimals(),
    name: symbol,
    faucetId,
    faucetIdBech32: accountIdToBech32(faucetId),
  };
}

export function useXykPool(poolId: string | undefined) {
  const { account: poolAccount, isLoading: poolLoading, error: poolError, refetch: refetchPool } = useAccountWithImport(poolId);

  const poolDerived = useMemo(() => {
    if (!poolAccount) return null;
    try {
      const storage = poolAccount.storage();
      if (!storage) return null;
      const assetsKey = Word.newFromFelts([
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
        new Felt(BigInt(0)),
      ]);
      const assetsValue = storage.getMapItem('zoro::lp_local::assets_mapping', assetsKey);
      if (!assetsValue) return null;
      const felts = assetsValue.toFelts();
      if (felts.length < 4) return null;
      const token0Id = accountIdFromPrefixSuffix(felts[1], felts[0]);
      const token1Id = accountIdFromPrefixSuffix(felts[3], felts[2]);
      const totalSupplyWord = storage.getItem('zoro::lp_local::total_supply');
      const totalSupplyFelts = totalSupplyWord?.toFelts() ?? [];
      const totalSupply = totalSupplyFelts[0]?.asInt() ?? BigInt(0);
      const reserveWord = storage.getItem('zoro::lp_local::reserve');
      const reserveFelts = reserveWord?.toFelts() ?? [];
      const reserve0 = reserveFelts[0]?.asInt() ?? BigInt(0);
      const reserve1 = reserveFelts[1]?.asInt() ?? BigInt(0);
      return {
        token0Id,
        token1Id,
        token0Bech32: accountIdToBech32(token0Id),
        token1Bech32: accountIdToBech32(token1Id),
        totalSupply,
        reserve0,
        reserve1,
      };
    } catch {
      return null;
    }
  }, [poolAccount]);

  const token0Bech32 = poolDerived?.token0Bech32;
  const token1Bech32 = poolDerived?.token1Bech32;
  const { account: token0Account, isLoading: token0Loading, error: token0Error, refetch: refetchToken0 } = useAccountWithImport(token0Bech32);
  const { account: token1Account, isLoading: token1Loading, error: token1Error, refetch: refetchToken1 } = useAccountWithImport(token1Bech32);

  const data = useMemo((): XykPoolData | null => {
    if (!poolDerived || !token0Account || !token1Account) return null;
    const token0 = tokenInfoFromAccount(poolDerived.token0Id, token0Account);
    const token1 = tokenInfoFromAccount(poolDerived.token1Id, token1Account);
    const priceToken0InToken1 = poolDerived.reserve1 > 0n
      ? Number(poolDerived.reserve1) / 10 ** token1.decimals
        / (Number(poolDerived.reserve0) / 10 ** token0.decimals)
      : 0;
    return {
      token0,
      token1,
      totalSupply: poolDerived.totalSupply,
      reserve0: poolDerived.reserve0,
      reserve1: poolDerived.reserve1,
      priceToken0InToken1,
    };
  }, [poolDerived, token0Account, token1Account]);

  const isLoading = poolLoading || (!!poolDerived && (token0Loading || token1Loading));
  const error = poolError ?? token0Error ?? token1Error ?? null;
  const refetch = useMemo(() => async () => {
    await refetchPool();
    if (token0Bech32) await refetchToken0();
    if (token1Bech32) await refetchToken1();
  }, [refetchPool, refetchToken0, refetchToken1, token0Bech32, token1Bech32]);

  return useMemo(
    () => ({ data, isLoading, error, refetch }),
    [data, isLoading, error, refetch],
  );
}
