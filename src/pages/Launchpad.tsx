import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import useLaunchpad, {
  getMidenscanAccountUrl,
  getMidenscanTxUrl,
  LAUNCH_STEPS,
  type LaunchStepIndex,
  type LaunchSuccess,
} from '@/hooks/useLaunchpad';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { truncateId } from '@/lib/format';
import { CheckCircle, ExternalLink, Info, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseUnits } from 'viem';

const SYMBOL_MIN = 3;
const SYMBOL_MAX = 6;
const DECIMALS_MIN = 0;
const DECIMALS_MAX = 8;
const TOTAL_SUPPLY_MAX = 100_000_000;

const MAX_SUPPLY_DISPLAY = TOTAL_SUPPLY_MAX.toLocaleString('en-US');

function validateSymbol(s: string): string | null {
  const trimmed = s.trim().toUpperCase();
  if (trimmed.length < SYMBOL_MIN) {
    return `Symbol must be at least ${SYMBOL_MIN} characters`;
  }
  if (trimmed.length > SYMBOL_MAX) {
    return `Symbol must be at most ${SYMBOL_MAX} characters`;
  }
  if (!/^[A-Z0-9]+$/.test(trimmed)) return 'Symbol must be letters and numbers only';
  return null;
}

function validateDecimals(n: number): string | null {
  if (!Number.isInteger(n) || n < DECIMALS_MIN) {
    return `Decimals must be at least ${DECIMALS_MIN}`;
  }
  if (n > DECIMALS_MAX) return `Decimals must be at most ${DECIMALS_MAX}`;
  return null;
}

function validateInitialSupply(raw: string, decimals: number): string | null {
  if (!raw.trim()) return 'Total supply is required';
  let amount: bigint;
  try {
    amount = parseUnits(raw.trim(), decimals);
  } catch {
    return 'Invalid amount';
  }
  if (amount <= 0n) return 'Total supply must be greater than 0';
  if (amount > TOTAL_SUPPLY_MAX) {
    return `Total supply must not exceed ${MAX_SUPPLY_DISPLAY} (raw units)`;
  }
  return null;
}

const bodyClass = 'text-sm text-muted-foreground leading-relaxed';
const labelClass = 'text-sm font-medium text-foreground';
const hintClass = 'text-sm text-muted-foreground';

export default function Launchpad() {
  const { connected } = useUnifiedWallet();
  const { launchToken, error, clearError } = useLaunchpad();
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState<string>('4');
  const [initialSupply, setInitialSupply] = useState('');
  const [touched, setTouched] = useState({
    symbol: false,
    decimals: false,
    supply: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launchStep, setLaunchStep] = useState<LaunchStepIndex | null>(null);
  const [successResult, setSuccessResult] = useState<LaunchSuccess | null>(null);
  const [copiedId, setCopiedId] = useState<'tx' | 'faucet' | null>(null);

  const symbolError = touched.symbol ? validateSymbol(symbol) : null;
  const decimalsNum = parseInt(decimals, 10);
  const decimalsError = touched.decimals
    ? validateDecimals(decimalsNum)
    : (Number.isNaN(decimalsNum) ? 'Invalid number' : null);
  const supplyError = touched.supply
    ? validateInitialSupply(initialSupply, Number.isNaN(decimalsNum) ? 4 : decimalsNum)
    : null;

  const canSubmit = connected
    && !symbolError
    && !decimalsError
    && !supplyError
    && symbol.trim().length >= SYMBOL_MIN
    && symbol.trim().length <= SYMBOL_MAX
    && !Number.isNaN(decimalsNum)
    && decimalsNum >= DECIMALS_MIN
    && decimalsNum <= DECIMALS_MAX
    && initialSupply.trim() !== ''
    && validateInitialSupply(initialSupply, decimalsNum) === null;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ symbol: true, decimals: true, supply: true });
    if (!canSubmit) return;
    const sym = symbol.trim().toUpperCase();
    const dec = decimalsNum;
    let supplyBigint: bigint;
    try {
      supplyBigint = parseUnits(initialSupply.trim(), dec);
    } catch {
      return;
    }
    if (supplyBigint <= 0n) return;
    setIsSubmitting(true);
    setLaunchStep(null);
    clearError();
    const result = await launchToken(
      {
        symbol: sym,
        decimals: dec,
        initialSupply: supplyBigint,
      },
      {
        onProgress: (step) => setLaunchStep(step),
      },
    );
    setIsSubmitting(false);
    setLaunchStep(null);
    if (result) {
      setSuccessResult(result);
      setSymbol('');
      setDecimals('4');
      setInitialSupply('');
      setTouched({ symbol: false, decimals: false, supply: false });
      clearError();
    }
  }, [canSubmit, symbol, decimalsNum, initialSupply, launchToken, clearError]);

  useEffect(() => {
    if (error) setSuccessResult(null);
  }, [error]);

  const copyToClipboard = useCallback((text: string, kind: 'tx' | 'faucet') => {
    navigator.clipboard.writeText(text);
    setCopiedId(kind);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Launchpad - ZoroSwap | DeFi on Miden</title>
      <meta name='description' content='Launch a new token on Miden testnet.' />
      <Header />
      <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
        <div className='max-w-xl mx-auto'>
          <div className='text-center mb-8 sm:mb-10'>
            <h1 className='text-2xl sm:text-3xl font-cal-sans font-bold text-foreground tracking-tight'>
              Token launchpad
            </h1>
            <p className={`mt-3 ${bodyClass}`}>
              Deploy a new faucet token on Miden and mint the whole initial supply to your
              account. You will need to consume the tokens in your wallet.
            </p>
          </div>

          <Card className='rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden'>
            <CardHeader className='space-y-3 pb-4 px-5 sm:px-8 pt-6 sm:pt-8 border-b border-border/60 bg-muted/20'>
              <CardTitle className='text-lg sm:text-xl font-cal-sans font-semibold text-foreground'>
                Configure your token
              </CardTitle>
              <p className={bodyClass}>
                Choose a symbol, decimals, and how many whole tokens to mint at launch.
                Launch usually takes a few seconds. Keep this tab open until it finishes.
              </p>
            </CardHeader>
            <CardContent className='space-y-6 px-5 sm:px-8 py-6 sm:py-8'>
              {successResult
                ? (
                  <div className='rounded-xl border border-green-500/40 bg-green-500/5 dark:bg-green-500/10 p-5 sm:p-6 space-y-5'>
                    <div className='flex items-center gap-2.5 text-green-700 dark:text-green-400'>
                      <CheckCircle className='h-5 w-5 shrink-0' />
                      <span className='text-sm font-semibold'>
                        Token launched successfully
                      </span>
                    </div>
                    <p className={bodyClass}>
                      Claim the note in your wallet to receive your tokens. You can launch
                      another token using the form below when you’re ready.
                    </p>
                    <div className='space-y-5'>
                      <div className='space-y-2'>
                        <span className={`${labelClass} block`}>Faucet ID</span>
                        <div className='flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border'>
                          <button
                            type='button'
                            onClick={() =>
                              copyToClipboard(successResult.faucetIdBech32, 'faucet')}
                            className='flex-1 text-left text-sm font-mono truncate hover:text-foreground text-muted-foreground'
                          >
                            {copiedId === 'faucet'
                              ? 'Copied!'
                              : truncateId(successResult.faucetIdBech32)}
                          </button>
                          <a
                            href={getMidenscanAccountUrl(successResult.faucetIdBech32)}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='shrink-0 text-muted-foreground hover:text-foreground p-1'
                            aria-label='View faucet on MidenScan'
                          >
                            <ExternalLink className='h-4 w-4' />
                          </a>
                        </div>
                        <a
                          href={getMidenscanAccountUrl(successResult.faucetIdBech32)}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors'
                        >
                          <ExternalLink className='h-4 w-4' />
                          View faucet on MidenScan
                        </a>
                      </div>
                      <div className='space-y-2'>
                        <span className={`${labelClass} block`}>Transaction ID</span>
                        <div className='flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border'>
                          <button
                            type='button'
                            onClick={() => copyToClipboard(successResult.txId, 'tx')}
                            className='flex-1 text-left text-sm font-mono truncate hover:text-foreground text-muted-foreground'
                          >
                            {copiedId === 'tx'
                              ? 'Copied!'
                              : truncateId(successResult.txId)}
                          </button>
                          <a
                            href={getMidenscanTxUrl(successResult.txId)}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='shrink-0 text-muted-foreground hover:text-foreground p-1'
                            aria-label='View tx on MidenScan'
                          >
                            <ExternalLink className='h-4 w-4' />
                          </a>
                        </div>
                        <a
                          href={getMidenscanTxUrl(successResult.txId)}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors'
                        >
                          <ExternalLink className='h-4 w-4' />
                          View transaction on MidenScan
                        </a>
                      </div>
                      <div className='rounded-xl border border-amber-500/35 bg-amber-500/8 dark:bg-amber-500/10 p-4'>
                        <p className={`${bodyClass} text-amber-900 dark:text-amber-200`}>
                          Open your wallet and claim the pending note so the minted supply
                          appears in your balance.
                        </p>
                      </div>
                    </div>
                  </div>
                )
                : null}

              {!connected
                ? (
                  <div className='rounded-xl border border-dashed border-border bg-muted/25 p-8 text-center space-y-4'>
                    <p className={bodyClass}>
                      Connect your wallet to deploy a token on Miden testnet.
                    </p>
                    <UnifiedWalletButton className='w-full max-w-sm mx-auto rounded-xl h-12 font-medium' />
                  </div>
                )
                : (
                  <form onSubmit={handleSubmit} className='space-y-6'>
                    <div className='space-y-2'>
                      <label htmlFor='launchpad-symbol' className={labelClass}>
                        Symbol
                      </label>
                      <Input
                        id='launchpad-symbol'
                        placeholder='e.g. ZORO'
                        value={symbol}
                        onChange={(e) => {
                          setSymbol(e.target.value.toUpperCase().slice(0, SYMBOL_MAX));
                          if (error) clearError();
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, symbol: true }))}
                        maxLength={SYMBOL_MAX}
                        className={`h-11 rounded-xl text-sm ${
                          symbolError ? 'border-destructive' : ''
                        }`}
                        aria-invalid={!!symbolError}
                        aria-describedby={symbolError
                          ? 'launchpad-symbol-error'
                          : undefined}
                      />
                      {symbolError && (
                        <p
                          id='launchpad-symbol-error'
                          className='text-sm text-destructive'
                        >
                          {symbolError}
                        </p>
                      )}
                      <p className={hintClass}>
                        {SYMBOL_MIN}–{SYMBOL_MAX} characters, letters and numbers only.
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <label htmlFor='launchpad-decimals' className={labelClass}>
                        Decimals
                      </label>
                      <Input
                        id='launchpad-decimals'
                        type='number'
                        min={DECIMALS_MIN}
                        max={DECIMALS_MAX}
                        value={decimals}
                        onChange={(e) => {
                          setDecimals(e.target.value);
                          if (error) clearError();
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, decimals: true }))}
                        className={`h-11 rounded-xl text-sm ${
                          decimalsError ? 'border-destructive' : ''
                        }`}
                        aria-invalid={!!decimalsError}
                      />
                      {decimalsError && (
                        <p className='text-sm text-destructive'>{decimalsError}</p>
                      )}
                      <p className={hintClass}>
                        Between {DECIMALS_MIN} and {DECIMALS_MAX}.
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <label htmlFor='launchpad-supply' className={labelClass}>
                        Initial supply
                      </label>
                      <Input
                        id='launchpad-supply'
                        type='text'
                        inputMode='decimal'
                        placeholder='e.g. 1 000 000'
                        value={initialSupply}
                        onChange={(e) => {
                          setInitialSupply(e.target.value);
                          if (error) clearError();
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, supply: true }))}
                        className={`h-11 rounded-xl text-sm ${
                          supplyError ? 'border-destructive' : ''
                        }`}
                        aria-invalid={!!supplyError}
                      />
                      {supplyError && (
                        <p className='text-sm text-destructive'>{supplyError}</p>
                      )}
                      <p className={hintClass}>
                        Whole number of tokens to mint (without decimals)
                      </p>
                    </div>

                    {isSubmitting && launchStep !== null && (
                      <ProgressBar
                        steps={LAUNCH_STEPS}
                        currentStepIndex={launchStep}
                        title='Progress'
                      />
                    )}

                    {error && (
                      <div
                        className='rounded-xl border border-red-500/40 bg-red-500/8 p-4 text-sm text-red-700 dark:text-red-400 leading-relaxed'
                        role='alert'
                      >
                        {error}
                      </div>
                    )}

                    <Button
                      type='submit'
                      className='w-full rounded-xl h-12 text-sm font-semibold'
                      size='lg'
                      disabled={!canSubmit || isSubmitting}
                    >
                      {isSubmitting
                        ? (
                          <>
                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                            Launching…
                          </>
                        )
                        : (
                          'Launch token'
                        )}
                    </Button>
                  </form>
                )}

              <div
                className='flex gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 dark:bg-blue-500/10 px-4 py-3.5'
                role='note'
              >
                <Info className='h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5' />
                <p className='text-xs text-foreground/90 leading-relaxed'>
                  <span className='font-medium text-foreground'>Token supply</span>{' '}
                  is capped at{' '}
                  <span className='font-mono tabular-nums text-foreground'>
                    {MAX_SUPPLY_DISPLAY}
                  </span>{' '}
                  raw units. Operations with large token amounts paired with high decimals
                  may fail due to current network limitations.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className='pt-8 pb-2 flex justify-center'>
            <Link to='/'>
              <Button
                variant='secondary'
                size='sm'
                className='text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors'
              >
                ← Back to Swap
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
