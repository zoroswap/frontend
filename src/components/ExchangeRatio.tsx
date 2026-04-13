import { OracleContext } from '@/providers/OracleContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useContext, useEffect, useRef, useState } from 'react';

const ExchangeRatio = (
  { assetA, assetB, overrideRatio }: {
    assetA: TokenConfig;
    assetB: TokenConfig;
    overrideRatio?: string;
  },
) => {
  const { getWebsocketPrice } = useContext(OracleContext);
  const [ratio, setRatio] = useState<number | undefined>(undefined);
  const activeRatio = useRef<undefined | number>(undefined);

  useEffect(() => {
    if (overrideRatio != null) return;
    const i = setInterval(() => {
      const priceA = getWebsocketPrice(assetA.oracleId);
      const priceB = getWebsocketPrice(assetB.oracleId);

      const newRatio = Number(priceA?.priceFeed.value ?? 0)
        / Number(priceB?.priceFeed.value ?? 1);
      if (newRatio != activeRatio.current) {
        setRatio(newRatio);
        activeRatio.current = newRatio;
      }
    }, 50);
    return () => clearInterval(i);
  }, [assetA.oracleId, assetB.oracleId, getWebsocketPrice, overrideRatio]);

  if (overrideRatio != null) {
    return <>{overrideRatio}</>;
  }

  return <>{ratio?.toFixed(8)}</>;

};

export default ExchangeRatio;
