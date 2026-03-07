import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { accountIdToBech32, cn } from '@/lib/utils';
import { AccountId } from '@miden-sdk/miden-sdk';
import { ArrowRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import type { XykStepProps } from '../XykWizard';

const FEE_TIERS = [
  { bps: 1, label: '0.01%', hint: 'Best for stable pairs' },
  { bps: 5, label: '0.05%', hint: 'Best for stable pairs' },
  { bps: 30, label: '0.30%', hint: 'Best for most pairs' },
  { bps: 100, label: '1.00%', hint: 'Best for exotic pairs' },
] as const;

const XykStep1 = (
  { tokensWithBalance, tokenMetadata, form, setForm, loading }: XykStepProps,
) => {
  const availableTokens = useMemo(() => {
    return Object.values(tokenMetadata ?? {});
  }, [tokenMetadata]);

  const setToken = useCallback((which: 'a' | 'b', id: AccountId) => {
    setForm({ ...form, ...(which === 'a' ? { tokenA: id } : { tokenB: id }) });
  }, [form, setForm]);
  const setFeeBps = useCallback((feeBps: number) => {
    setForm({ ...form, feeBps });
  }, [form, setForm]);

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h3 className='text-sm font-semibold text-foreground'>Select pair</h3>
        <p className='text-xs text-muted-foreground'>
          Choose the base and quote tokens from assets you hold.
        </p>
        {loading
          ? <p className='text-xs text-muted-foreground mt-2'>Loading your tokens…</p>
          : tokensWithBalance.length === 0
          ? (
            <p className='text-xs text-muted-foreground mt-2'>
              You have no token balance. Get tokens from the faucet first.
            </p>
          )
          : (
            <div className='flex items-center gap-2 mt-2'>
              <div className='flex-1 min-w-0'>
                <label className='text-xs text-muted-foreground sr-only'>
                  Base token
                </label>
                <TokenAutocomplete
                  tokens={availableTokens}
                  value={form.tokenA
                    ? tokenMetadata[accountIdToBech32(form.tokenA)]
                    : undefined}
                  onChange={(val) => setToken('a', AccountId.fromBech32(val))}
                  excludeFaucetIdBech32={form.tokenB
                    ? accountIdToBech32(form.tokenB)
                    : undefined}
                  placeholder='Base token'
                  className='w-full'
                />
              </div>
              <span className='text-muted-foreground shrink-0'>
                <ArrowRight className='h-4 w-4' />
              </span>
              <div className='flex-1 min-w-0'>
                <label className='text-xs text-muted-foreground sr-only'>
                  Quote token
                </label>
                <TokenAutocomplete
                  tokens={availableTokens}
                  value={form.tokenB
                    ? tokenMetadata[accountIdToBech32(form.tokenB)]
                    : undefined}
                  onChange={(val) => setToken('b', AccountId.fromBech32(val))}
                  excludeFaucetIdBech32={form.tokenA
                    ? accountIdToBech32(form.tokenA)
                    : undefined}
                  placeholder='Quote token'
                  className='w-full'
                />
              </div>
            </div>
          )}
      </div>

      <div className='space-y-2'>
        <h3 className='text-sm font-semibold text-foreground'>Fee tier</h3>
        <p className='text-xs text-muted-foreground'>
          The amount earned providing liquidity. Choose an amount that suits your risk
          tolerance and strategy.
        </p>
        <div className='grid grid-cols-2 gap-3 mt-3'>
          {FEE_TIERS.map(({ bps, label, hint }) => (
            <button
              key={bps}
              type='button'
              onClick={() => setFeeBps(bps)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-colors min-h-[88px] flex flex-col justify-center',
                form.feeBps === bps
                  ? 'bg-primary text-primary-foreground border-primary shadow-none'
                  : 'bg-card border-border text-foreground hover:border-muted-foreground/50',
              )}
            >
              <span
                className={cn(
                  'font-bold text-lg block',
                  form.feeBps === bps ? 'text-primary-foreground' : 'text-foreground',
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  'text-xs mt-1 block',
                  form.feeBps === bps
                    ? 'text-primary-foreground/90'
                    : 'text-muted-foreground',
                )}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>
      </div>
      )
    </div>
  );
};

export default XykStep1;
