import { OracleContext } from '@/providers/OracleContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits } from 'viem';
import { Input } from './ui/input';

const SwapInputBuy = (
  { amountSell, assetBuy, assetSell, overrideAmount }: {
    amountSell?: bigint;
    assetBuy?: TokenConfig;
    assetSell?: TokenConfig;
    overrideAmount?: bigint;
  },
) => {
  const { getWebsocketPrice } = useContext(OracleContext);
  const [stringBuy, setStringBuy] = useState<string>('');
  const activeStringBuy = useRef<undefined | string>(undefined);

  // When overrideAmount is provided, display it directly (XYK mode)
  useEffect(() => {
    if (overrideAmount == null || !assetBuy) return;
    const formatted = formatUnits(overrideAmount, assetBuy.decimals);
    if (formatted !== activeStringBuy.current) {
      setStringBuy(formatted);
      activeStringBuy.current = formatted;
    }
  }, [overrideAmount, assetBuy]);

  // Oracle-based estimation (hfAMM mode)
  useEffect(() => {
    if (overrideAmount != null) return;
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

      const ratio = Number(priceB?.priceFeed.value ?? 0)
        / Number(priceA?.priceFeed.value ?? 1);

      const newBuy = BigInt(Math.floor((ratio ?? 1) * 1e12)) * amountSell
        / BigInt(10 ** (assetBuy.decimals - assetSell.decimals + 12));

      const newStringBuy = formatUnits(newBuy, assetBuy.decimals);

      if (newStringBuy != activeStringBuy.current) {
        setStringBuy(newStringBuy);
        activeStringBuy.current = newStringBuy;
      }
    }, 50);
    return () => clearInterval(i);
  }, [assetBuy, assetSell, amountSell, getWebsocketPrice, overrideAmount]);

  const html = useMemo(() => {
    return (
      <Input
        type='number'
        value={stringBuy}
        disabled
        placeholder='0'
        className='border-none text-4xl sm:text-6xl font-semibold text-muted-foreground outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner bg-transparent placeholder:text-muted-foreground'
      />
    );
  }, [stringBuy]);

  return html;
};

export default SwapInputBuy;
