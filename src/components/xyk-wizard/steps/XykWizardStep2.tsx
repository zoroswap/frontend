import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { prettyBigintFormat } from '@/lib/format';
import { accountIdToBech32 } from '@/lib/utils';
import { useCallback, useMemo } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { XykPairIcon, type XykStepProps } from '../XykWizard';

const XykStep2 = (
  { tokensWithBalance, tokenMetadata, form, setForm }: XykStepProps,
) => {
  const tokenA = useMemo(() => {
    return tokenMetadata[form.tokenA ? accountIdToBech32(form.tokenA) : ''];
  }, [form.tokenA, tokenMetadata]);
  const tokenB = useMemo(() => {
    return tokenMetadata[form.tokenB ? accountIdToBech32(form.tokenB) : ''];
  }, [form.tokenB, tokenMetadata]);

  const setAmountA = useCallback((amount: string) => {
    if (tokenA) {
      const metadata = tokenMetadata[tokenA.faucetIdBech32];
      const val = parseUnits(amount, metadata.decimals);
      setForm({ ...form, amountA: val });
    }
  }, [form, setForm, tokenMetadata, tokenA]);
  const setAmountB = useCallback((amount: string) => {
    if (tokenB) {
      const metadata = tokenMetadata[tokenB.faucetIdBech32];
      const val = parseUnits(amount, metadata.decimals);
      setForm({ ...form, amountB: val });
    }
  }, [form, setForm, tokenMetadata, tokenB]);
  const setMaxA = useCallback(() => {
    if (tokenA) {
      const token = tokensWithBalance.find(({ config }) => {
        return tokenA != null && config.faucetIdBech32 === tokenA.faucetIdBech32;
      });
      setForm({ ...form, amountA: token?.amount ?? BigInt(0) });
    }
  }, [form, setForm, tokenA, tokensWithBalance]);

  const setMaxB = useCallback(() => {
    if (tokenB) {
      const token = tokensWithBalance.find(({ config }) => {
        return tokenB != null && config.faucetIdBech32 === tokenB.faucetIdBech32;
      });
      setForm({ ...form, amountB: token?.amount ?? BigInt(0) });
    }
  }, [form, setForm, tokenB, tokensWithBalance]);

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

  const formattedBalanceA = useMemo(() => {
    const token = tokensWithBalance.find(({ config }) => {
      return tokenA != null && config.faucetIdBech32 === tokenA.faucetIdBech32;
    });
    return prettyBigintFormat({
      value: token?.amount || BigInt(0),
      expo: tokenA.decimals,
    });
  }, [tokenA, tokensWithBalance]);
  const formattedBalanceB = useMemo(() => {
    const token = tokensWithBalance.find(({ config }) => {
      return tokenB != null && config.faucetIdBech32 === tokenB.faucetIdBech32;
    });
    return prettyBigintFormat({
      value: token?.amount || BigInt(0),
      expo: tokenB.decimals,
    });
  }, [tokenB, tokensWithBalance]);

  return (
    <div className='space-y-0'>
      <h3 className='text-sm font-medium text-foreground mb-3'>Select your tokens</h3>
      <div className='rounded-xl border border-border bg-background overflow-hidden'>
        <div className='p-4 flex items-start justify-between gap-3'>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={formattedAmountA}
            onChange={(e) => setAmountA(e.target.value)}
            className='flex-1 min-w-0 text-lg border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 h-auto'
          />
          <div className='flex items-center gap-2 shrink-0'>
            <span className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground shrink-0'>
              {(tokenA?.symbol ?? '?')[0].toUpperCase()}
            </span>
            <span className='font-medium text-sm'>{tokenA.symbol}</span>
          </div>
        </div>
        <div className='px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground'>
          <span>Balance: {formattedBalanceA ?? '0.00'} {tokenA.symbol}</span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-primary text-xs'
            onClick={setMaxA}
          >
            Max
          </Button>
        </div>
        <div className='border-t border-border' />
        <div className='p-4 flex items-start justify-between gap-3'>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={formattedAmountB}
            onChange={(e) => setAmountB(e.target.value)}
            className='flex-1 min-w-0 text-lg border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 h-auto'
          />
          <div className='flex items-center gap-2 shrink-0'>
            <span className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground shrink-0'>
              {(tokenB.symbol || '?')[0].toUpperCase()}
            </span>
            <span className='font-medium text-sm'>{tokenB.symbol}</span>
          </div>
        </div>
        <div className='px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground'>
          <span>Balance: {formattedBalanceB ?? '0.00'} {tokenB.symbol}</span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-primary text-xs'
            onClick={setMaxB}
          >
            Max
          </Button>
        </div>
      </div>
      <p className='text-xs text-muted-foreground mt-2'>
        Pair: <XykPairIcon symbolA={tokenA.symbol} symbolB={tokenB.symbol} size={20} />
        {' '}
        {tokenA.symbol} / {tokenB.symbol}
      </p>
    </div>
  );
};

export default XykStep2;
