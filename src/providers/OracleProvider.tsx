import { useWebSocket } from '@/hooks/useWebSocket';
import { ORACLE } from '@/lib/config';
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OracleContext } from './OracleContext';
import { ZoroContext } from './ZoroContext';

const MAX_AGE = 3000;

export interface PriceData {
  value: number;
  publish_time: number;
}

interface OracleResponse {
  binary: {
    data: `0x${string}`[];
    encoding: 'hex';
  };
  parsed: {
    id: string;
    price: { price: number; publish_time: number };
  }[];
}

export const OracleProvider = ({ children }: { children: ReactNode }) => {
  const [prices, setPrices] = useState<
    Record<string, { age: number; priceFeed: PriceData } | undefined>
  >({});
  const [binary, setBinary] = useState<`0x${string}`[] | undefined>(undefined);
  const isFetching = useRef(false);
  const websocketPrices = useRef<
    Record<string, { age: number; priceFeed: PriceData } | undefined>
  >({});
  const { liquidity_pools } = useContext(ZoroContext);
  const pricesToRefresh = useMemo(() => {
    return liquidity_pools.map(p => p.faucetIdBech32);
  }, [liquidity_pools]);

  const pricesRef = useRef(prices);
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  // Memoize channels to prevent re-subscription loop
  const oracleChannels = useMemo(() => [{ channel: 'oracle_prices' as const }], []);

  // WebSocket connection for real-time price updates
  useWebSocket({
    channels: oracleChannels,
    onMessage: (message) => {
      if (message.type === 'OraclePriceUpdate') {
        const now = Date.now();
        websocketPrices.current = {
          ...websocketPrices.current,

          [message.oracle_id]: {
            age: now,
            priceFeed: {
              value: message.price / 1e8, // Convert from backend format
              publish_time: message.timestamp,
            },
          },
        };
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(websocketPrices.current);
    }, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const refreshPrices = useCallback(
    async (ids: string | string[], force?: boolean) => {
      if (isFetching.current) return;
      isFetching.current = true;

      const now = Date.now();
      const want = (Array.isArray(ids) ? ids : [ids])
        .filter(id =>
          force
          || !pricesRef.current[id]
          || (now - pricesRef.current[id].age) > MAX_AGE
        );

      if (want.length === 0) {
        isFetching.current = false;
        return;
      }

      const resp = await fetchOraclePrices(
        want,
      );

      if (resp) {
        setBinary(resp.binary);
        setPrices(prev => {
          const updates: typeof prev = {};
          for (const feed of Object.keys(resp.priceFeeds)) {
            updates[feed] = {
              age: now,
              priceFeed: resp.priceFeeds[feed],
            };
          }
          return { ...prev, ...updates };
        });
      }

      isFetching.current = false;
    },
    [],
  );

  useEffect(() => {
    refreshPrices(pricesToRefresh);
  }, [refreshPrices, pricesToRefresh]);

  const getBinary = useCallback(() => Promise.resolve(binary ?? []), [binary]);

  const getWebsocketPrice = useCallback(
    (oracleId: string) => websocketPrices.current[oracleId],
    [],
  );

  const contextValue = useMemo(
    () => ({ prices, refreshPrices, getBinary, getWebsocketPrice }),
    [prices, refreshPrices, getBinary, getWebsocketPrice],
  );

  return (
    <OracleContext.Provider value={contextValue}>
      {children}
    </OracleContext.Provider>
  );
};

const fetchOraclePrices = async (
  assetIds: string[],
): Promise<{
  priceFeeds: Record<string, PriceData>;
  binary: `0x${string}`[];
}> => {
  const params = new URLSearchParams();
  for (const assetId of assetIds) {
    params.append('id[]', assetId);
  }
  try {
    const prices: OracleResponse = await fetch(
      `${ORACLE.endpoint}?${params}`,
    ).then((res) => res.json());
    return {
      priceFeeds: prices.parsed.reduce((allFeeds, feed) => ({
        ...allFeeds,
        [feed.id]: {
          value: (feed.price.price / 1e8),
          publish_time: feed.price.publish_time,
        },
      }), {} as Record<string, PriceData>),
      binary: prices.binary.data.map(d => `0x${d}`) as `0x${string}`[],
    };
  } catch (e) {
    console.error(e);
    return {
      priceFeeds: {},
      binary: ['0x'],
    };
  }
};
