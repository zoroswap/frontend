import { OracleContext } from '@/providers/OracleContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { formalNumberFormat, formatTokenAmount } from '@/utils/format';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

const Price = (
  { tokenConfig, amount = BigInt(10 ** tokenConfig.decimals) }: {
    tokenConfig: TokenConfig;
    amount?: bigint;
  },
) => {
  const { getWebsocketPrice } = useContext(OracleContext);
  const [price, setPrice] = useState<string | undefined>(undefined);
  const activePrice = useRef<undefined | string>(undefined);
  const amountAsNum = useMemo(() =>
    formatTokenAmount({
      value: amount,
      expo: tokenConfig.decimals,
    }) ?? 1, [amount, tokenConfig.decimals]);

  useEffect(() => {
    const i = setInterval(() => {
      const price = getWebsocketPrice(tokenConfig.oracleId);
      const formattedPrice = price?.priceFeed.value
        ? formalNumberFormat(price.priceFeed.value * amountAsNum)
        : undefined;
      if (formattedPrice != activePrice.current) {
        setPrice(formattedPrice);
        activePrice.current = formattedPrice;
      }
    }, 50);
    return () => clearInterval(i);
  }, [amountAsNum, getWebsocketPrice, tokenConfig.oracleId]);

  const html = useMemo(() => {
    return <>{price}</>;
  }, [price]);

  return html;
};

export default Price;
