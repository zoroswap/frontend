import { type AccountId, AccountId as AccountIdClass } from '@miden-sdk/miden-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { ModalContext } from '@/providers/ModalContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { ZoroContext } from '@/providers/ZoroContext';
import { useBalance } from '@/hooks/useBalance';
import { useTokensWithBalance } from '@/hooks/useTokensWithBalance';
import { accountIdToBech32, bech32ToAccountId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, ChevronLeft, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Two circles with first letter of each symbol (XYK pool style) */
function XykPairIcon({ symbolA, symbolB, size = 24 }: { symbolA: string; symbolB: string; size?: number }) {
  const letterA = (symbolA || '?')[0].toUpperCase();
  const letterB = (symbolB || '?')[0].toUpperCase();
  return (
    <span className="flex items-center">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground"
        style={{ width: size, height: size, marginRight: -size / 4, zIndex: 1 }}
      >
        {letterA}
      </span>
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted/80 text-xs font-semibold text-foreground"
        style={{ width: size, height: size, zIndex: 0 }}
      >
        {letterB}
      </span>
    </span>
  );
}

const HEX_REGEX = /^(0x)?[0-9a-fA-F]+$/;

/** Parse faucet ID from bech32 (e.g. mtst1...) or hex (with or without 0x). Returns AccountId or null. */
function parseFaucetIdToAccountId(value: string): AccountId | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    if (HEX_REGEX.test(v)) {
      const hex = v.startsWith('0x') ? v : `0x${v}`;
      return AccountIdClass.fromHex(hex);
    }
    const id = bech32ToAccountId(v);
    return id ?? null;
  } catch {
    return null;
  }
}

function minimalTokenFromFaucetId(
  rawInput: string,
  symbol: string,
  decimals = 18,
): TokenConfig | null {
  const v = rawInput?.trim();
  if (!v) return null;
  try {
    const faucetId = parseFaucetIdToAccountId(v);
    if (!faucetId) return null;
    const faucetIdBech32 = HEX_REGEX.test(v) ? accountIdToBech32(faucetId) : v;
    return {
      symbol,
      name: symbol,
      decimals,
      faucetId,
      faucetIdBech32,
      oracleId: '',
    };
  } catch {
    return null;
  }
}

/** Resolve faucet input to token: use known token symbol/decimals if faucet matches, else minimal token. */
function resolveTokenFromFaucetInput(
  rawInput: string,
  fallbackSymbol: string,
  knownTokens: Record<string, TokenConfig> | undefined,
): TokenConfig | null {
  const minimal = minimalTokenFromFaucetId(rawInput, fallbackSymbol);
  if (!minimal || !knownTokens) return minimal;
  const known = knownTokens[minimal.faucetIdBech32];
  if (known) {
    return { ...minimal, symbol: known.symbol, name: known.name, decimals: known.decimals };
  }
  return minimal;
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
  const { tokens: knownTokens } = useContext(ZoroContext);
  const { tokensWithBalance, loading: tokensWithBalanceLoading } = useTokensWithBalance();

  const [step, setStep] = useState<Step>(1);
  const [baseFaucetId, setBaseFaucetId] = useState('');
  const [quoteFaucetId, setQuoteFaucetId] = useState('');
  const [feeBps, setFeeBps] = useState<number>(30);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [step1Attempted, setStep1Attempted] = useState(false);

  const tokenA = useMemo(
    () => resolveTokenFromFaucetInput(baseFaucetId, 'Base', knownTokens ?? undefined),
    [baseFaucetId, knownTokens],
  );
  const tokenB = useMemo(
    () => resolveTokenFromFaucetInput(quoteFaucetId, 'Quote', knownTokens ?? undefined),
    [quoteFaucetId, knownTokens],
  );

  const {
    balance: balanceA,
    formatted: formattedBalanceA,
    refetch: refetchBalanceA,
  } = useBalance({ token: tokenA ?? undefined });
  const {
    balance: balanceB,
    formatted: formattedBalanceB,
    refetch: refetchBalanceB,
  } = useBalance({ token: tokenB ?? undefined });

  useEffect(() => {
    if (step === 2) {
      refetchBalanceA();
      refetchBalanceB();
    }
  }, [step, refetchBalanceA, refetchBalanceB]);

  const sameIds = baseFaucetId.trim() === quoteFaucetId.trim() && baseFaucetId.trim().length > 0;
  const canContinueStep1 = Boolean(
    baseFaucetId.trim() && quoteFaucetId.trim() && !sameIds,
  );
  const step1BlockReason =
    !baseFaucetId.trim()
      ? 'Select base token.'
      : !quoteFaucetId.trim()
        ? 'Select quote token.'
        : sameIds
          ? 'Base and quote must be different.'
          : null;
  const canContinueStep2 = useMemo(() => {
    const a = amountA.trim() && parseFloat(amountA) > 0;
    const b = amountB.trim() && parseFloat(amountB) > 0;
    return a && b;
  }, [amountA, amountB]);

  const next = useCallback(() => {
    if (step === 1) {
      if (!canContinueStep1) {
        setStep1Attempted(true);
        return;
      }
      setStep1Attempted(false);
    }
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
              setStep1Attempted(false);
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

      {/* Step 1: Base & quote token selects (from assets user has) + fee tier */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Select pair</h3>
            <p className="text-xs text-muted-foreground">
              Choose the base and quote tokens from assets you hold.
            </p>
            {tokensWithBalanceLoading ? (
              <p className="text-xs text-muted-foreground mt-2">Loading your tokens…</p>
            ) : tokensWithBalance.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                You have no token balance. Get tokens from the faucet first.
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-muted-foreground sr-only">Base token</label>
                  <TokenAutocomplete
                    tokens={tokensWithBalance}
                    value={tokenA ?? undefined}
                    onChange={setBaseFaucetId}
                    placeholder="Base token"
                    className="w-full"
                  />
                </div>
                <span className="text-muted-foreground shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-muted-foreground sr-only">Quote token</label>
                  <TokenAutocomplete
                    tokens={tokensWithBalance}
                    value={tokenB ?? undefined}
                    onChange={setQuoteFaucetId}
                    excludeFaucetIdBech32={baseFaucetId || undefined}
                    placeholder="Quote token"
                    className="w-full"
                  />
                </div>
              </div>
            )}
            {step1Attempted && step1BlockReason && (
              <p className="text-xs text-destructive mt-2" role="alert">
                {step1BlockReason}
              </p>
            )}
            {canContinueStep1 && (
              <p className="text-xs text-muted-foreground mt-1">
                You are creating a new XYK Pool. Amounts in the next step will use these tokens.
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
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground shrink-0">
                  {(tokenA.symbol || '?')[0].toUpperCase()}
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
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground shrink-0">
                  {(tokenB.symbol || '?')[0].toUpperCase()}
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
          <p className="text-xs text-muted-foreground mt-2">
            Pair: <XykPairIcon symbolA={tokenA.symbol} symbolB={tokenB.symbol} size={20} /> {tokenA.symbol} / {tokenB.symbol}
          </p>
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
