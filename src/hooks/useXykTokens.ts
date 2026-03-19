import { accountIdToBech32 } from '@/lib/utils';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useCallback, useMemo } from 'react';
import { useTokens } from './useTokens';
import { useXykPools } from './useXykPools';

/**
 * Provides XYK token metadata, pair-filtering, and pool lookup
 * for use on the Swap page.
 */
export function useXykTokens() {
  const { xykPools } = useXykPools();

  const allFaucetBech32s = useMemo(() => {
    const set = new Set<string>();
    for (const pool of xykPools) {
      set.add(accountIdToBech32(pool.token0));
      set.add(accountIdToBech32(pool.token1));
    }
    return [...set];
  }, [xykPools]);

  const { tokens: xykTokenMap } = useTokens(allFaucetBech32s);

  const xykTokens = useMemo<TokenConfig[]>(
    () => Object.values(xykTokenMap),
    [xykTokenMap],
  );

  // Map from faucet bech32 -> set of counterpart faucet bech32s
  const pairMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const pool of xykPools) {
      const t0 = accountIdToBech32(pool.token0);
      const t1 = accountIdToBech32(pool.token1);
      if (!m.has(t0)) m.set(t0, new Set());
      if (!m.has(t1)) m.set(t1, new Set());
      m.get(t0)!.add(t1);
      m.get(t1)!.add(t0);
    }
    return m;
  }, [xykPools]);

  const getXykPairTokens = useCallback(
    (faucetIdBech32: string): string[] => {
      return [...(pairMap.get(faucetIdBech32) ?? [])];
    },
    [pairMap],
  );

  // Pool bech32 map keyed by "tokenA|tokenB" (both orderings)
  const poolLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const pool of xykPools) {
      const t0 = accountIdToBech32(pool.token0);
      const t1 = accountIdToBech32(pool.token1);
      const poolBech32 = accountIdToBech32(pool.xykPoolId);
      m.set(`${t0}|${t1}`, poolBech32);
      m.set(`${t1}|${t0}`, poolBech32);
    }
    return m;
  }, [xykPools]);

  const findXykPool = useCallback(
    (sellBech32: string, buyBech32: string): string | undefined => {
      return poolLookup.get(`${sellBech32}|${buyBech32}`);
    },
    [poolLookup],
  );

  return { xykTokens, getXykPairTokens, findXykPool };
}
