import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { accountIdToBech32, cn } from '@/lib/utils';
import { AccountId } from '@miden-sdk/miden-sdk';
import { ArrowRight, Info } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import type { XykStepProps } from '../XykWizard';

/** Order two account IDs by hex: lower hex = token0 (base), higher = token1 (quote). */
export function orderPairByHex(a: AccountId, b: AccountId): [AccountId, AccountId] {
  const hexA = a.toString();
  const hexB = b.toString();
  return hexA <= hexB ? [a, b] : [b, a];
}

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

  const orderedPair = useMemo((): {
    base: AccountId;
    quote: AccountId;
    baseMeta?: (typeof availableTokens)[number];
    quoteMeta?: (typeof availableTokens)[number];
  } | null => {
    if (!form.tokenA || !form.tokenB || !tokenMetadata) return null;
    const [base, quote] = orderPairByHex(form.tokenA, form.tokenB);
    const baseBech = accountIdToBech32(base);
    const quoteBech = accountIdToBech32(quote);
    return {
      base,
      quote,
      baseMeta: tokenMetadata[baseBech],
      quoteMeta: tokenMetadata[quoteBech],
    };
  }, [form.tokenA, form.tokenB, tokenMetadata]);

  return (
    <div className='flex-col gap-8 flex w-full'>
      {/* Select pair */}
      <section className='space-y-2'>
        <h3 className='text-xl text-foreground'>Select pair</h3>
        <p className='text-sm text-muted-foreground'>
          Choose the tokens you want to provide liquidity for. You can select tokens on
          all supported networks.
        </p>
        {loading
          ? <p className='text-sm text-muted-foreground mt-2'>Loading your tokens…</p>
          : tokensWithBalance.length === 0
          ? (
            <p className='text-sm text-muted-foreground mt-2'>
              You have no token balance. Get tokens from the faucet first.
            </p>
          )
          : (
            <div className='flex items-center gap-3 mt-3'>
              <div className='flex-1 min-w-0'>
                <label className='text-xs text-muted-foreground sr-only'>
                  Token A
                </label>
                <TokenAutocomplete
                  tokens={availableTokens}
                  value={form.tokenA && tokenMetadata
                    ? tokenMetadata[accountIdToBech32(form.tokenA)]
                    : undefined}
                  onChange={(val) => setToken('a', AccountId.fromBech32(val))}
                  excludeFaucetIdBech32={form.tokenB
                    ? accountIdToBech32(form.tokenB)
                    : undefined}
                  placeholder='Select a token'
                  className='w-full'
                />
              </div>
              <span className='text-muted-foreground shrink-0' aria-hidden>
                <ArrowRight className='h-5 w-5' />
              </span>
              <div className='flex-1 min-w-0'>
                <label className='text-xs text-muted-foreground sr-only'>
                  Token B
                </label>
                <TokenAutocomplete
                  tokens={availableTokens}
                  value={form.tokenB && tokenMetadata
                    ? tokenMetadata[accountIdToBech32(form.tokenB)]
                    : undefined}
                  onChange={(val) => setToken('b', AccountId.fromBech32(val))}
                  excludeFaucetIdBech32={form.tokenA
                    ? accountIdToBech32(form.tokenA)
                    : undefined}
                  placeholder='Select a token'
                  className='w-full'
                />
              </div>
            </div>
          )}
        <div className='flex items-start gap-2 rounded-lg border text-xs border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
          <Info className='h-4 w-4 shrink-0 mt-0.5' aria-hidden />
          <p>
            Base and quote (token0 / token1) are determined by the token account ID hex
            value: the token with the lower{' '}
            hex is base (token0), the other is quote (token1).
          </p>
        </div>

        {orderedPair && (
          <div className='mt-4 flex flex-wrap items-center gap-2'>
            <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              Pool order
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                'bg-primary/15 text-primary border border-primary/30',
              )}
            >
              <span className='text-muted-foreground font-normal'>Base</span>
              <span>{orderedPair.baseMeta?.symbol ?? '…'}</span>
            </span>
            <ArrowRight className='h-4 w-4 text-muted-foreground' aria-hidden />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                'bg-muted text-foreground border border-border',
              )}
            >
              <span className='text-muted-foreground font-normal'>Quote</span>
              <span>{orderedPair.quoteMeta?.symbol ?? '…'}</span>
            </span>
          </div>
        )}
      </section>

      {/* Fee tier */}
      <section>
        <h3 className='text-foreground text-xl'>Fee tier</h3>
        <p className='text-sm text-muted-foreground'>
          The amount earned providing liquidity. Choose an amount that suits your risk
          tolerance and strategy.
        </p>
        <div className='grid grid-cols-2 gap-3 mt-3'>
          {FEE_TIERS.map(({ bps, label, hint }) => {
            const is30 = bps === 30;
            return (
              <button
                key={bps}
                type='button'
                disabled={!is30}
                onClick={() => is30 && setFeeBps(bps)}
                className={cn(
                  'rounded-xl border-2 px-4 text-left transition-colors md:min-h-[150px] flex flex-col justify-center items-center',
                  form.feeBps === bps
                    ? 'bg-primary text-primary-foreground border-primary shadow-none'
                    : 'bg-card border-border text-foreground hover:border-muted-foreground/50',
                  !is30 && 'opacity-60 cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'font-bold text-xl block',
                    form.feeBps === bps ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'text-base mt-1 block',
                    form.feeBps === bps
                      ? 'text-primary-foreground/90'
                      : 'text-muted-foreground',
                  )}
                >
                  {hint}
                </span>
              </button>
            );
          })}
        </div>
        <p className='text-muted-foreground text-sm mt-3'>
          Constant product pools are fixed to 30BP fee for the time being.
        </p>
      </section>
    </div>
  );
};

export default XykStep1;
