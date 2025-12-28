import { emptyFn } from '@/utils/shared';
import { createContext, useContext, useMemo } from 'react';

export interface PriceData {
  value: number;
  publish_time: number;
}

interface OracleContextProps {
  refreshPrices: (ids: string[], force?: boolean) => void;
  prices: Record<string, { age: number; priceFeed: PriceData } | undefined>;
  getBinary: (ids?: string[]) => Promise<string[]>;
  getWebsocketPrice: (id: string) => { age: number; priceFeed: PriceData } | undefined;
}

export const OracleContext = createContext({
  refreshPrices: emptyFn,
  prices: {},
  getBinary: () => Promise.resolve([]),
  getWebsocketPrice: () => undefined,
} as OracleContextProps);

export const useOraclePrices = (ids: string[]) => {
  const { prices } = useContext(OracleContext);
  const res = useMemo(() => {
    const r: Record<string, PriceData> = {};
    for (const id of ids) {
      if (prices[id]) {
        r[id] = prices[id].priceFeed;
      }
    }
    return r;
  }, [prices, ids]);
  return res;
};
