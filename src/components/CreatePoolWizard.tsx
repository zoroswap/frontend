import type { AccountId } from '@miden-sdk/miden-sdk';
import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalContext } from '@/providers/ModalContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useBalance } from '@/hooks/useBalance';
import { bech32ToAccountId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, ChevronLeft, X } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';

const FAUCET_ID_MIN_LENGTH = 40;
const FAUCET_ID_MAX_LENGTH = 100;

function validateFaucetId(value: string): { valid: boolean; error?: string } {
  const v = value?.trim();
  if (!v) return { valid: false, error: 'Faucet ID is required' };
  if (v.length < FAUCET_ID_MIN_LENGTH) return { valid: false, error: 'Faucet ID is too short' };
  if (v.length > FAUCET_ID_MAX_LENGTH) return { valid: false, error: 'Faucet ID is too long' };
  try {
    const id = bech32ToAccountId(v);
    if (id == null) return { valid: false, error: 'Invalid faucet ID format' };
    return { valid: true };
  } catch {
    return { valid: false, error: 'Must be a valid bech32 faucet ID (AccountId)' };
  }
}

function isValidFaucetId(value: string): boolean {
  return validateFaucetId(value).valid;
}

function minimalTokenFromFaucetId(
  faucetIdBech32: string,
  symbol: string,
): TokenConfig | null {
  const v = faucetIdBech32?.trim();
  if (!v) return null;
  try {
    const faucetId = bech32ToAccountId(v) as AccountId | undefined;
    if (!faucetId) return null;
    return {
      symbol,
      name: symbol,
      decimals: 18,
      faucetId,
      faucetIdBech32: v,
      oracleId: '',
    };
  } catch {
    return null;
  }
}

type Step = 1 | 2 | 3 | 4;

const FEE_TIERS = [
  { bps: 1, label: '0.01%', hint: 'Best for stable pairs' },
  { bps: 5, label: '0.05%', hint: 'Best for stable pairs' },
  { bps: 30, label: '0.30%', hint: 'Best for most pairs' },
  { bps: 100, label: '1.00%', hint: 'Best for exotic pairs' },
] as const;

type CreatedPoolDraft = {
  id: string;
  type: 'xyk';
  tokenA: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  tokenB: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  feeBps: number;
  createdAt: number;
  status: 'draft';
};

const STORAGE_KEY = 'zoro-created-pools';

export function readCreatedPools(): CreatedPoolDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CreatedPoolDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCreatedPools(pools: CreatedPoolDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}

export function clearCreatedPools(): void {
  writeCreatedPools([]);
}

export function CreatePoolWizard({ onCreated }: { onCreated?: () => void }) {
  const { closeModal } = useContext(ModalContext);

  const [step, setStep] = useState<Step>(1);
  const [baseFaucetId, setBaseFaucetId] = useState('');
  const [quoteFaucetId, setQuoteFaucetId] = useState('');
  const [feeBps, setFeeBps] = useState<number>(30);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  const tokenA = useMemo(
    () => minimalTokenFromFaucetId(baseFaucetId, 'Base'),
    [baseFaucetId],
  );
  const tokenB = useMemo(
    () => minimalTokenFromFaucetId(quoteFaucetId, 'Quote'),
    [quoteFaucetId],
  );

  const { balance: balanceA, formatted: formattedBalanceA } = useBalance({ token: tokenA ?? undefined });
  const { balance: balanceB, formatted: formattedBalanceB } = useBalance({ token: tokenB ?? undefined });

  const baseValidation = useMemo(() => validateFaucetId(baseFaucetId), [baseFaucetId]);
  const quoteValidation = useMemo(() => validateFaucetId(quoteFaucetId), [quoteFaucetId]);
  const baseValid = baseValidation.valid;
  const quoteValid = quoteValidation.valid;
  const canContinueStep1 = Boolean(
    baseValid && quoteValid && baseFaucetId.trim() !== quoteFaucetId.trim(),
  );
  const canContinueStep2 = useMemo(() => {
    const a = amountA.trim() && parseFloat(amountA) > 0;
    const b = amountB.trim() && parseFloat(amountB) > 0;
    return a && b;
  }, [amountA, amountB]);

  const next = useCallback(() => {
    if (step === 1 && !canContinueStep1) return;
    if (step === 2 && !canContinueStep2) return;
    setStep((s) => (s < 4 ? (s + 1) as Step : s));
  }, [step, canContinueStep1, canContinueStep2]);

  const back = useCallback(() => {
    setStep((s) => (s > 1 ? (s - 1) as Step : 1));
  }, []);

  const setMaxA = useCallback(() => {
    if (formattedBalanceA) setAmountA(formattedBalanceA);
  }, [formattedBalanceA]);
  const setMaxB = useCallback(() => {
    if (formattedBalanceB) setAmountB(formattedBalanceB);
  }, [formattedBalanceB]);

  const onCreate = useCallback(() => {
    if (!tokenA || !tokenB) return;
    const draft: CreatedPoolDraft = {
      id: crypto.randomUUID(),
      type: 'xyk',
      tokenA: { symbol: tokenA.symbol, name: tokenA.name, faucetIdBech32: tokenA.faucetIdBech32 },
      tokenB: { symbol: tokenB.symbol, name: tokenB.name, faucetIdBech32: tokenB.faucetIdBech32 },
      feeBps,
      createdAt: Date.now(),
      status: 'draft',
    };
    const existing = readCreatedPools();
    writeCreatedPools([draft, ...existing]);
    setStep(4);
    onCreated?.();
  }, [feeBps, onCreated, tokenA, tokenB]);

  const initialPricePerA = useMemo(() => {
    const a = parseFloat(amountA) || 0;
    const b = parseFloat(amountB) || 0;
    if (a <= 0) return null;
    return b / a;
  }, [amountA, amountB]);

  // Step 4: Congratulations
  if (step === 4) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative flex justify-center">
          <h2 className="text-xl font-bold font-cal-sans text-foreground text-center">
            Congratulations!
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 rounded-full shrink-0 -mr-2"
            onClick={closeModal}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="h-20 w-20 rounded-full border-2 border-green-500 bg-white flex items-center justify-center">
            <Check className="h-10 w-10 text-green-600 stroke-[2.5]" />
          </div>
          <p className="text-lg font-medium text-foreground">Pool created successfully!</p>
          <p className="text-sm text-muted-foreground">
            View your Pool at Address: (saved to Your pools)
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="w-full rounded-lg bg-primary text-primary-foreground h-11"
            onClick={closeModal}
          >
            Go to Pools
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-lg h-10 bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
            onClick={() => {
              setStep(1);
              setBaseFaucetId('');
              setQuoteFaucetId('');
              setAmountA('');
              setAmountB('');
            }}
          >
            Create new pool
          </Button>
        </div>
      </div>
    );
  }

  const stepTitle =
    step === 1
      ? 'Create a new Liquidity Pool'
      : step === 2
        ? 'Deposit Tokens'
        : 'Confirm your details';

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex items-center justify-center gap-2">
        {step < 4 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0 rounded-full shrink-0 -ml-2"
            onClick={step === 1 ? closeModal : back}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex flex-col items-center">
          {step < 4 && (
            <span className="text-xs text-muted-foreground mb-0.5">
              Step {step} of 3
            </span>
          )}
          <h2 className="text-xl font-bold font-cal-sans text-foreground text-center">
            {step === 1 ? (
              <>
                Create a new <span className="underline decoration-primary decoration-2 underline-offset-2">Liquidity Pool</span>
              </>
            ) : (
              stepTitle
            )}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 rounded-full shrink-0 -mr-2"
          onClick={closeModal}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Step 1: Base & quote faucet ids + fee tier */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Select pair</h3>
            <p className="text-xs text-muted-foreground">
              Enter the base and quote token faucet IDs (valid AccountId or bech32 address).
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Base faucet id (bech32)"
                  value={baseFaucetId}
                  onChange={(e) => setBaseFaucetId(e.target.value)}
                  className={cn(
                    'rounded-xl bg-background border font-mono text-sm',
                    baseFaucetId.trim() && !baseValid && 'border-destructive',
                  )}
                />
                {baseFaucetId.trim() && !baseValid && baseValidation.error && (
                  <p className="text-xs text-destructive">{baseValidation.error}</p>
                )}
              </div>
              <span className="text-muted-foreground shrink-0">
                <ArrowRight className="h-4 w-4" />
              </span>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Quote faucet id (bech32)"
                  value={quoteFaucetId}
                  onChange={(e) => setQuoteFaucetId(e.target.value)}
                  className={cn(
                    'rounded-xl bg-background border font-mono text-sm',
                    quoteFaucetId.trim() && !quoteValid && 'border-destructive',
                  )}
                />
                {quoteFaucetId.trim() && !quoteValid && quoteValidation.error && (
                  <p className="text-xs text-destructive">{quoteValidation.error}</p>
                )}
              </div>
            </div>
            {canContinueStep1 && (
              <p className="text-xs text-muted-foreground mt-1">
                You are creating a new XYK Pool. Amounts in the next step will use these faucets.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Fee tier</h3>
            <p className="text-xs text-muted-foreground">
              The amount earned providing liquidity. Choose an amount that suits your risk tolerance and strategy.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {FEE_TIERS.map(({ bps, label, hint }) => (
                <button
                  key={bps}
                  type="button"
                  onClick={() => setFeeBps(bps)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-colors min-h-[88px] flex flex-col justify-center',
                    feeBps === bps
                      ? 'bg-primary text-primary-foreground border-primary shadow-none'
                      : 'bg-card border-border text-foreground hover:border-muted-foreground/50',
                  )}
                >
                  <span className={cn(
                    'font-bold text-lg block',
                    feeBps === bps ? 'text-primary-foreground' : 'text-foreground',
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-xs mt-1 block',
                    feeBps === bps ? 'text-primary-foreground/90' : 'text-muted-foreground',
                  )}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Deposit tokens */}
      {step === 2 && tokenA && tokenB && (
        <div className="space-y-0">
          <h3 className="text-sm font-medium text-foreground mb-3">Select your tokens</h3>
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <div className="p-4 flex items-start justify-between gap-3">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="flex-1 min-w-0 text-lg border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 h-auto"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-muted">
                  <AssetIcon symbol={tokenA.symbol} size={24} />
                </span>
                <span className="font-medium text-sm">{tokenA.symbol}</span>
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Balance: {formattedBalanceA ?? '0.00'} {tokenA.symbol}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-primary text-xs"
                onClick={setMaxA}
              >
                Max
              </Button>
            </div>
            <div className="border-t border-border" />
            <div className="p-4 flex items-start justify-between gap-3">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="flex-1 min-w-0 text-lg border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 h-auto"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-muted">
                  <AssetIcon symbol={tokenB.symbol} size={24} />
                </span>
                <span className="font-medium text-sm">{tokenB.symbol}</span>
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Balance: {formattedBalanceB ?? '0.00'} {tokenB.symbol}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-primary text-xs"
                onClick={setMaxB}
              >
                Max
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && tokenA && tokenB && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pair</span>
              <span className="font-medium text-foreground">{tokenA.symbol}/{tokenB.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee tier</span>
              <span className="text-foreground">{(feeBps / 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min. Deposit</span>
              <span className="text-foreground">
                {amountB && parseFloat(amountB) >= 0 ? `${parseFloat(amountB).toFixed(1)} ${tokenB.symbol}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max. Deposit</span>
              <span className="text-foreground">
                {amountA && parseFloat(amountA) >= 0 ? `${parseFloat(amountA).toFixed(2)} ${tokenA.symbol}` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 px-2 -mx-1 rounded-md bg-green-500/10">
              <span className="text-green-700 dark:text-green-400">APY</span>
              <span className="font-medium text-green-700 dark:text-green-400">1.24% - 3.45%</span>
            </div>
            <div className="flex justify-between py-1.5 px-2 -mx-1 rounded-md bg-green-500/10">
              <span className="text-green-700 dark:text-green-400">APR</span>
              <span className="font-medium text-green-700 dark:text-green-400">2.07%</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions: primary first; Back only on steps 2–3 (step 1 has chevron only) */}
      <div className="flex flex-col gap-2 pt-1">
        {step < 3 ? (
          <Button
            className="w-full rounded-lg bg-primary text-primary-foreground h-11"
            onClick={next}
            disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
          >
            Next Step
          </Button>
        ) : (
          <Button
            className="w-full rounded-lg bg-primary text-primary-foreground h-11"
            onClick={onCreate}
          >
            Confirm
          </Button>
        )}
        {step > 1 && (
          <Button
            variant="outline"
            className="w-full rounded-lg h-10 bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
            onClick={back}
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
