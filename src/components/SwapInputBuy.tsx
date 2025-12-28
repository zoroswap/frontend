import { OracleContext } from '@/providers/OracleContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits } from 'viem';
import { Input } from './ui/input';

const SwapInputBuy = (
  { amountSell, assetBuy, assetSell }: {
    amountSell?: bigint;
    assetBuy?: TokenConfig;
    assetSell?: TokenConfig;
  },
) => {
  const { getWebsocketPrice } = useContext(OracleContext);
  const [stringBuy, setStringBuy] = useState<string | undefined>(undefined);
  const activeStringBuy = useRef<undefined | string>(undefined);

  useEffect(() => {
    const i = setInterval(() => {
      if (!amountSell || !assetBuy || !assetSell) {
        const newStringBuy = '';
        if (newStringBuy != activeStringBuy.current) {
          setStringBuy(newStringBuy);
          activeStringBuy.current = newStringBuy;
        }
        return;
      }
      const priceA = getWebsocketPrice(assetBuy.oracleId);
      const priceB = getWebsocketPrice(assetSell.oracleId);

      const ratio = Number(priceA?.priceFeed.value ?? 0)
        / Number(priceB?.priceFeed.value ?? 1);

      const newBuy = BigInt(Math.floor((ratio ?? 1) * 1e12)) * amountSell
        / BigInt(10 ** (assetBuy.decimals - assetSell.decimals + 12));

      const newStringBuy = formatUnits(newBuy, assetBuy.decimals);

      if (newStringBuy != activeStringBuy.current) {
        setStringBuy(newStringBuy);
        activeStringBuy.current = newStringBuy;
      }
    }, 50);
    return () => clearInterval(i);
  }, [assetBuy, assetSell, amountSell, getWebsocketPrice]);

  const html = useMemo(() => {
    return (
      <Input
        type='number'
        value={stringBuy}
        disabled
        placeholder='0'
        className='border-none text-3xl sm:text-4xl font-light outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner bg-transparent'
      />
    );
  }, [stringBuy]);

  return html;
};

export default SwapInputBuy;
