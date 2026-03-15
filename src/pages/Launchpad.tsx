import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import { ProgressBar } from '@/components/ProgressBar';
import useLaunchpad, {
  getMidenscanAccountUrl,
  getMidenscanTxUrl,
  LAUNCH_STEPS,
  type LaunchStepIndex,
  type LaunchSuccess,
} from '@/hooks/useLaunchpad';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { truncateId } from '@/lib/format';
import { ArrowLeft, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseUnits } from 'viem';

const SYMBOL_MIN = 3;
const SYMBOL_MAX = 6;
const DECIMALS_MIN = 0;
const DECIMALS_MAX = 4;
const TOTAL_SUPPLY_MAX = 1_000_000;

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
  if (!raw.trim()) return 'Initial supply is required';
  let amount: bigint;
  try {
    amount = parseUnits(raw.trim(), decimals);
  } catch {
    return 'Invalid amount';
  }
  if (amount <= 0n) return 'Initial supply must be greater than 0';
  if (amount > TOTAL_SUPPLY_MAX) {
    return `Initial supply should be lower than ${TOTAL_SUPPLY_MAX}`;
  }
  return null;
}

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
      <main className='flex-1 w-full max-w-lg mx-auto px-6 py-8'>
        <Link
          to='/'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Swap
        </Link>

        <Card className='rounded-xl border border-border bg-card'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xl font-cal-sans font-bold'>
              Token Launchpad
            </CardTitle>
            <p className='text-sm text-muted-foreground mt-1'>
              Create a new faucet token and mint initial supply to your wallet.
            </p>
            <p className='text-xs text-muted-foreground mt-2'>
              Launching a new token can take a couple of seconds. Please wait until the
              process completes.
            </p>
          </CardHeader>
          <CardContent className='space-y-4'>
            {successResult
              ? (
                <div className='rounded-xl border-2 border-green-500/50 bg-green-500/10 p-4 space-y-4'>
                  <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
                    <CheckCircle className='h-5 w-5 shrink-0' />
                    <span className='font-semibold'>Token launched successfully</span>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Claim the note with your token supply in your wallet to receive the
                    tokens. You can launch another token below.
                  </p>
                  <div className='space-y-3'>
                    <div className='space-y-1.5'>
                      <label className='text-xs text-muted-foreground block'>
                        Faucet ID (new token)
                      </label>
                      <div className='flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border'>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboard(successResult.faucetIdBech32, 'faucet')}
                          className='flex-1 text-left text-sm font-mono truncate hover:text-foreground'
                        >
                          {copiedId === 'faucet'
                            ? 'Copied!'
                            : truncateId(successResult.faucetIdBech32)}
                        </button>
                        <a
                          href={getMidenscanAccountUrl(successResult.faucetIdBech32)}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='shrink-0 text-muted-foreground hover:text-foreground'
                          aria-label='View faucet on MidenScan'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </a>
                      </div>
                      <a
                        href={getMidenscanAccountUrl(successResult.faucetIdBech32)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center justify-center gap-2 w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/50'
                      >
                        <ExternalLink className='h-4 w-4' />
                        View faucet on MidenScan
                      </a>
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-xs text-muted-foreground block'>
                        Transaction ID
                      </label>
                      <div className='flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border'>
                        <button
                          type='button'
                          onClick={() => copyToClipboard(successResult.txId, 'tx')}
                          className='flex-1 text-left text-sm font-mono truncate hover:text-foreground'
                        >
                          {copiedId === 'tx' ? 'Copied!' : truncateId(successResult.txId)}
                        </button>
                        <a
                          href={getMidenscanTxUrl(successResult.txId)}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='shrink-0 text-muted-foreground hover:text-foreground'
                          aria-label='View tx on MidenScan'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </a>
                      </div>
                      <a
                        href={getMidenscanTxUrl(successResult.txId)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center justify-center gap-2 w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/50'
                      >
                        <ExternalLink className='h-4 w-4' />
                        View transaction on MidenScan
                      </a>
                    </div>
                    <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-3'>
                      <p className='text-sm text-amber-700 dark:text-amber-400'>
                        Go to your{' '}
                        wallet and claim the pending note to receive your token supply in
                        your wallet.
                      </p>
                    </div>
                  </div>
                </div>
              )
              : null}

            {!connected
              ? (
                <div className='rounded-lg border border-border bg-muted/30 p-4 text-center'>
                  <p className='text-sm text-muted-foreground mb-3'>
                    Connect your wallet to launch a token.
                  </p>
                  <UnifiedWalletButton className='w-full rounded-lg h-11' />
                </div>
              )
              : (
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <label htmlFor='launchpad-symbol' className='text-sm font-medium'>
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
                      onBlur={() =>
                        setTouched((t) => ({ ...t, symbol: true }))}
                      maxLength={SYMBOL_MAX}
                      className={symbolError ? 'border-destructive' : ''}
                      aria-invalid={!!symbolError}
                      aria-describedby={symbolError
                        ? 'launchpad-symbol-error'
                        : undefined}
                    />
                    {symbolError && (
                      <p id='launchpad-symbol-error' className='text-xs text-destructive'>
                        {symbolError}
                      </p>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      {SYMBOL_MIN}–{SYMBOL_MAX} characters, letters and numbers only
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <label htmlFor='launchpad-decimals' className='text-sm font-medium'>
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
                      className={decimalsError ? 'border-destructive' : ''}
                      aria-invalid={!!decimalsError}
                    />
                    {decimalsError && (
                      <p className='text-xs text-destructive'>{decimalsError}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label htmlFor='launchpad-supply' className='text-sm font-medium'>
                      Initial supply
                    </label>
                    <Input
                      id='launchpad-supply'
                      type='text'
                      inputMode='decimal'
                      placeholder='e.g. 1000000'
                      value={initialSupply}
                      onChange={(e) => {
                        setInitialSupply(e.target.value);
                        if (error) clearError();
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, supply: true }))}
                      className={supplyError ? 'border-destructive' : ''}
                      aria-invalid={!!supplyError}
                    />
                    {supplyError && (
                      <p className='text-xs text-destructive'>{supplyError}</p>
                    )}
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
                      className='rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400'
                      role='alert'
                    >
                      {error}
                    </div>
                  )}

                  <Button
                    type='submit'
                    className='w-full rounded-lg h-11'
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
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
