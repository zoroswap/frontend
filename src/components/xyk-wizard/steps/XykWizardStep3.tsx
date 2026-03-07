import { accountIdToBech32 } from '@/lib/utils';
import { useMemo } from 'react';
import { formatUnits } from 'viem';
import type { XykStepProps } from '../XykWizard';

const XykStep3 = ({ tokenMetadata, form }: XykStepProps) => {
  const tokenA = useMemo(() => {
    return tokenMetadata[form.tokenA ? accountIdToBech32(form.tokenA) : ''];
  }, [form.tokenA, tokenMetadata]);
  const tokenB = useMemo(() => {
    return tokenMetadata[form.tokenB ? accountIdToBech32(form.tokenB) : ''];
  }, [form.tokenB, tokenMetadata]);
  const formattedAmountA = useMemo(() => {
    if (tokenA) {
      return parseFloat(formatUnits(form.amountA ?? BigInt(0), tokenA.decimals));
    } else {
      return 0;
    }
  }, [form.amountA, tokenA]);
  const formattedAmountB = useMemo(() => {
    if (tokenB) {
      return parseFloat(formatUnits(form.amountB ?? BigInt(0), tokenB.decimals));
    } else {
      return 0;
    }
  }, [form.amountB, tokenB]);

  return (
    <div className='space-y-3'>
      <div className='rounded-xl border border-border bg-background p-4 space-y-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Pair</span>
          <span className='font-medium text-foreground'>
            {tokenA.symbol}/{tokenB.symbol}
          </span>
        </div>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Fee tier</span>
          <span className='text-foreground'>
            {(form.feeBps ? form.feeBps / 100 : 0).toFixed(2)}%
          </span>
        </div>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Base token deposit</span>
          <span className='text-foreground'>
            {formattedAmountA}
          </span>
        </div>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Quote token deposit</span>
          <span className='text-foreground'>
            {formattedAmountB}
          </span>
        </div>
      </div>
    </div>
  );
};

export default XykStep3;
