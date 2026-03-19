import AssetIcon from '@/components/AssetIcon';
import { ProgressBar } from '@/components/ProgressBar';
import Slippage from '@/components/Slippage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMidenscanNoteUrl, getMidenscanTxUrl } from '@/hooks/useLaunchpad';
import { useTokens } from '@/hooks/useTokens';
import { useWaitForNoteConsumed } from '@/hooks/useWaitForNoteConsumed';
import { useXykDeposit } from '@/hooks/useXykDeposit';
import { useXykLpBalance } from '@/hooks/useXykLpBalance';
import { useXykPool } from '@/hooks/useXykPool';
import type { XykTokenInfo } from '@/hooks/useXykPool';
import { useXykWithdraw } from '@/hooks/useXykWithdraw';
import { DEFAULT_SLIPPAGE } from '@/lib/config';
import { formatTokenAmount, formatTokenAmountForInput } from '@/lib/format';
import { computeExpectedLp, computeExpectedWithdraw } from '@/lib/xykMath';
import { ModalContext } from '@/providers/ModalContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { AlertTriangle, ArrowRight, ExternalLink, Info, Loader, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useBalance } from '../hooks/useBalance';

const LP_PROGRESS_STEPS = [
  'Creating note',
  'Sending note',
  'Waiting for confirmation on network',
] as const;

/** LP shares have no decimals (raw integer). */
const LP_EXPO = 0;
const PERCENTAGES = [25, 50, 75, 100] as const;

const validateValue = (val: bigint, max: bigint) =>
  val > max ? 'Amount too large' : val <= 0n ? 'Invalid value' : undefined;

export type LpActionType = 'Deposit' | 'Withdraw';

export interface XykPoolModalProps {
  poolId: string;
  onSuccess?: () => void;
  onClose?: () => void;
  initialMode?: LpActionType;
}

export function XykPoolModal({
  poolId,
  onSuccess,
  onClose,
  initialMode = 'Deposit',
}: XykPoolModalProps) {
  const modalContext = useContext(ModalContext);
  const { data: poolData, isLoading: poolLoading } = useXykPool(poolId);
  const { lpBalance, refetch: refetchLpBalance } = useXykLpBalance(poolId);
  const faucetIds = useMemo(
    () =>
      poolData
        ? [
          poolData.token0.faucetIdBech32,
          poolData.token1.faucetIdBech32,
        ]
        : [],
    [poolData],
  );
  const { tokens: tokensMetadata } = useTokens(faucetIds);

  const {
    deposit,
    isLoading: isDepositLoading,
    error: depositError,
  } = useXykDeposit(poolId);
  const {
    withdraw,
    isLoading: isWithdrawLoading,
    error: withdrawError,
  } = useXykWithdraw(poolId);

  const xykTokenToConfig = useCallback((t: XykTokenInfo): TokenConfig => ({
    symbol: t.symbol,
    name: t.name ?? t.symbol,
    decimals: t.decimals,
    faucetId: t.faucetId,
    faucetIdBech32: t.faucetIdBech32,
    oracleId: '',
  }), []);

  const token0Config = useMemo(
    () =>
      poolData
        ? (tokensMetadata[poolData.token0.faucetIdBech32]
          ?? xykTokenToConfig(poolData.token0))
        : undefined,
    [poolData, tokensMetadata, xykTokenToConfig],
  );
  const token1Config = useMemo(
    () =>
      poolData
        ? (tokensMetadata[poolData.token1.faucetIdBech32]
          ?? xykTokenToConfig(poolData.token1))
        : undefined,
    [poolData, tokensMetadata, xykTokenToConfig],
  );

  const { balance: balance0 } = useBalance({ token: token0Config });
  const { balance: balance1 } = useBalance({ token: token1Config });

  const [mode, setMode] = useState<LpActionType>(initialMode);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [amount0Str, setAmount0Str] = useState('');
  const [amount1Str, setAmount1Str] = useState('');
  const [lpAmountStr, setLpAmountStr] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();
  const [depositPct, setDepositPct] = useState(100);
  const [withdrawPct, setWithdrawPct] = useState(100);
  const [lpProgressStep, setLpProgressStep] = useState<number | null>(null);
  const [lastLpAction, setLastLpAction] = useState<
    {
      type: 'Deposit' | 'Withdraw';
      noteId: string;
      txId: string | undefined;
      amount0: bigint;
      amount1: bigint;
      token0Symbol: string;
      token1Symbol: string;
      token0Decimals: number;
      token1Decimals: number;
      lpAmount?: bigint;
    } | null
  >(null);

  const waitForNoteConsumed = useWaitForNoteConsumed({ timeoutMs: 60_000 });

  useEffect(() => {
    if (!isDepositLoading && !isWithdrawLoading) setLpProgressStep(null);
  }, [isDepositLoading, isWithdrawLoading]);

  const clearForm = useCallback(() => {
    setAmount0Str('');
    setAmount1Str('');
    setLpAmountStr('');
    setDepositPct(100);
    setWithdrawPct(100);
    setInputError(undefined);
  }, []);

  const handleClose = useCallback(() => {
    modalContext.closeModal();
    onClose?.();
  }, [modalContext, onClose]);

  const amount0 = useMemo(() => {
    const s = typeof amount0Str === 'string' ? amount0Str.trim() : '';
    if (!poolData || !s) return 0n;
    try {
      return parseUnits(s, poolData.token0.decimals);
    } catch {
      return 0n;
    }
  }, [poolData, amount0Str]);

  const amount1 = useMemo(() => {
    const s = typeof amount1Str === 'string' ? amount1Str.trim() : '';
    if (!poolData || !s) return 0n;
    try {
      return parseUnits(s, poolData.token1.decimals);
    } catch {
      return 0n;
    }
  }, [poolData, amount1Str]);

  const lpAmount = useMemo(() => {
    const s = typeof lpAmountStr === 'string' ? lpAmountStr.trim() : '';
    if (!s) return 0n;
    try {
      return parseUnits(s, LP_EXPO);
    } catch {
      return 0n;
    }
  }, [lpAmountStr]);

  const expectedLp = useMemo(() => {
    if (!poolData || (amount0 === 0n && amount1 === 0n)) return 0n;
    return computeExpectedLp(
      amount0,
      amount1,
      poolData.reserve0,
      poolData.reserve1,
      poolData.totalSupply,
    );
  }, [poolData, amount0, amount1]);

  const minAmountOutDeposit = useMemo(() => {
    if (expectedLp === 0n) return 1n;
    const slippageMultiplier = BigInt(Math.round((100 - slippage) * 1e6));
    const min = (expectedLp * slippageMultiplier) / BigInt(1e8);
    return min > 0n ? min : 1n;
  }, [expectedLp, slippage]);

  const [expectedWithdraw0, expectedWithdraw1] = useMemo(() => {
    if (!poolData || lpAmount === 0n || poolData.totalSupply === 0n) {
      return [0n, 0n];
    }
    return computeExpectedWithdraw(
      poolData.totalSupply,
      lpAmount,
      poolData.reserve0,
      poolData.reserve1,
    );
  }, [poolData, lpAmount]);

  const minAmountOutWithdraw0 = useMemo(() => {
    if (expectedWithdraw0 === 0n) return 1n;
    const slippageMultiplier = BigInt(Math.round((100 - slippage) * 1e6));
    const min = (expectedWithdraw0 * slippageMultiplier) / BigInt(1e8);
    return min > 0n ? min : 1n;
  }, [expectedWithdraw0, slippage]);

  const minAmountOutWithdraw1 = useMemo(() => {
    if (expectedWithdraw1 === 0n) return 1n;
    const slippageMultiplier = BigInt(Math.round((100 - slippage) * 1e6));
    const min = (expectedWithdraw1 * slippageMultiplier) / BigInt(1e8);
    return min > 0n ? min : 1n;
  }, [expectedWithdraw1, slippage]);

  const poolSharePct = useMemo(() => {
    if (!poolData || expectedLp === 0n) return null;
    const newTotalLp = poolData.totalSupply + expectedLp;
    if (newTotalLp === 0n) return null;
    return (Number(expectedLp) / Number(newTotalLp)) * 100;
  }, [poolData, expectedLp]);

  const poolShareDisplay = poolSharePct != null
    ? poolSharePct < 0.01
      ? `${poolSharePct.toFixed(6)}%`
      : `${poolSharePct.toFixed(2)}%`
    : '—';

  const withdrawPoolSharePct = useMemo(() => {
    if (!poolData || lpAmount === 0n) return null;
    const totalAfter = poolData.totalSupply - lpAmount;
    if (totalAfter <= 0n) return null;
    const userAfter = (lpBalance ?? 0n) >= lpAmount ? (lpBalance ?? 0n) - lpAmount : 0n;
    const pct = (Number(userAfter) / Number(totalAfter)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [poolData, lpAmount, lpBalance]);

  const withdrawPoolShareDisplay = withdrawPoolSharePct != null
    ? withdrawPoolSharePct < 0.01
      ? `${withdrawPoolSharePct.toFixed(6)}%`
      : `${withdrawPoolSharePct.toFixed(2)}%`
    : '—';

  const maxDepositA0 = useMemo(() => {
    if (!poolData) return 0n;
    const b0 = balance0 ?? 0n;
    const b1 = balance1 ?? 0n;
    const r0 = poolData.reserve0;
    const r1 = poolData.reserve1;
    if (r1 === 0n) return b0;
    const fromB1 = (b1 * r0) / r1;
    return b0 < fromB1 ? b0 : fromB1;
  }, [poolData, balance0, balance1]);

  const setDepositPercentage = useCallback(
    (percentage: number) => {
      if (!poolData || maxDepositA0 === 0n) return;
      const r0 = poolData.reserve0;
      const r1 = poolData.reserve1;
      const a0 = (maxDepositA0 * BigInt(percentage)) / 100n;
      const a1 = (a0 * r1) / r0;
      setAmount0Str(
        formatTokenAmountForInput({
          value: a0,
          expo: poolData.token0.decimals,
        }),
      );
      setAmount1Str(
        formatTokenAmountForInput({
          value: a1,
          expo: poolData.token1.decimals,
        }),
      );
      setDepositPct(percentage);
      setInputError(undefined);
    },
    [poolData, maxDepositA0],
  );

  const onDepositAmount0Change = useCallback(
    (val: string) => {
      const s = typeof val === 'string' ? val : '';
      setAmount0Str(s);
      if (s === '') {
        setAmount1Str('');
        setDepositPct(0);
        setInputError(undefined);
        return;
      }
      try {
        const parsed = parseUnits(s, poolData?.token0.decimals ?? 18);
        const b0 = balance0 ?? 0n;
        const err = validateValue(parsed, b0);
        if (err) {
          setInputError(err);
          return;
        }
        setInputError(undefined);
        if (maxDepositA0 > 0n) {
          const pct = Number((parsed * 100n) / maxDepositA0);
          setDepositPct(Math.min(100, Math.max(0, pct)));
        }
        if (poolData && poolData.reserve0 > 0n && parsed > 0n) {
          const a1 = (parsed * poolData.reserve1) / poolData.reserve0;
          setAmount1Str(
            formatTokenAmountForInput({
              value: a1,
              expo: poolData.token1.decimals,
            }),
          );
        }
      } catch {
        setInputError('Invalid value');
      }
    },
    [poolData, balance0, maxDepositA0],
  );

  const onDepositAmount1Change = useCallback(
    (val: string) => {
      const s = typeof val === 'string' ? val : '';
      setAmount1Str(s);
      if (s === '') {
        setAmount0Str('');
        setDepositPct(0);
        setInputError(undefined);
        return;
      }
      try {
        const parsed = parseUnits(s, poolData?.token1.decimals ?? 18);
        const b1 = balance1 ?? 0n;
        const err = validateValue(parsed, b1);
        if (err) {
          setInputError(err);
          return;
        }
        setInputError(undefined);
        if (poolData && poolData.reserve1 > 0n) {
          const maxA1 = (maxDepositA0 * poolData.reserve1) / poolData.reserve0;
          if (maxA1 > 0n) {
            const pct = Number((parsed * 100n) / maxA1);
            setDepositPct(Math.min(100, Math.max(0, pct)));
          }
        }
        if (poolData && poolData.reserve1 > 0n && parsed > 0n) {
          const a0 = (parsed * poolData.reserve0) / poolData.reserve1;
          setAmount0Str(
            formatTokenAmountForInput({
              value: a0,
              expo: poolData.token0.decimals,
            }),
          );
        }
      } catch {
        setInputError('Invalid value');
      }
    },
    [poolData, balance1, maxDepositA0],
  );

  const setWithdrawPercentage = useCallback(
    (percentage: number) => {
      const bal = lpBalance ?? 0n;
      const newValue = (bal * BigInt(percentage)) / 100n;
      setLpAmountStr(
        formatTokenAmountForInput({ value: newValue, expo: LP_EXPO }),
      );
      setWithdrawPct(percentage);
      setInputError(undefined);
    },
    [lpBalance],
  );

  const onWithdrawInputChange = useCallback(
    (val: string) => {
      const s = typeof val === 'string' ? val : '';
      setLpAmountStr(s);
      if (s === '') {
        setWithdrawPct(0);
        setInputError(undefined);
        return;
      }
      try {
        const parsed = parseUnits(s, LP_EXPO);
        const bal = lpBalance ?? 0n;
        const err = validateValue(parsed, bal);
        if (err) setInputError(err);
        else {
          setInputError(undefined);
          if (bal > 0n) {
            const pct = Number((parsed * 100n) / bal);
            setWithdrawPct(Math.min(100, Math.max(0, pct)));
          }
        }
      } catch {
        setInputError('Invalid value');
      }
    },
    [lpBalance],
  );

  const writeDeposit = useCallback(async () => {
    if (!poolData) return;
    const b0 = balance0 ?? 0n;
    const b1 = balance1 ?? 0n;
    if (amount0 > b0 || amount1 > b1) {
      setInputError('Insufficient balance');
      return;
    }
    if (amount0 <= 0n && amount1 <= 0n) {
      setInputError('Enter amounts');
      return;
    }
    setInputError(undefined);
    setLpProgressStep(null);
    const result = await deposit(amount0, amount1, {
      onProgress: (step) => setLpProgressStep(step),
      waitForNoteConsumed,
    });
    if (result) {
      clearForm();
      refetchLpBalance();
      onSuccess?.();
      setLastLpAction({
        type: 'Deposit',
        noteId: result.noteId,
        txId: result.txId,
        amount0,
        amount1,
        token0Symbol: poolData.token0.symbol,
        token1Symbol: poolData.token1.symbol,
        token0Decimals: poolData.token0.decimals,
        token1Decimals: poolData.token1.decimals,
      });
    }
  }, [
    poolData,
    amount0,
    amount1,
    balance0,
    balance1,
    deposit,
    clearForm,
    refetchLpBalance,
    onSuccess,
    waitForNoteConsumed,
  ]);

  const writeWithdraw = useCallback(async () => {
    if (!poolData) return;
    const bal = lpBalance ?? 0n;
    if (lpAmount > bal) {
      setInputError('Insufficient LP balance');
      return;
    }
    if (lpAmount <= 0n) {
      setInputError('Enter amount');
      return;
    }
    setInputError(undefined);
    setLpProgressStep(null);
    const result = await withdraw(lpAmount, {
      onProgress: (step) => setLpProgressStep(step),
      waitForNoteConsumed,
    });
    if (result) {
      clearForm();
      refetchLpBalance();
      onSuccess?.();
      setLastLpAction({
        type: 'Withdraw',
        noteId: result.noteId,
        txId: result.txId,
        amount0: expectedWithdraw0,
        amount1: expectedWithdraw1,
        token0Symbol: poolData.token0.symbol,
        token1Symbol: poolData.token1.symbol,
        token0Decimals: poolData.token0.decimals,
        token1Decimals: poolData.token1.decimals,
        lpAmount,
      });
    }
  }, [
    poolData,
    lpAmount,
    lpBalance,
    expectedWithdraw0,
    expectedWithdraw1,
    withdraw,
    clearForm,
    refetchLpBalance,
    onSuccess,
    waitForNoteConsumed,
  ]);

  if (poolLoading || !poolData) {
    return (
      <div className='flex flex-col gap-5 p-6'>
        <p className='text-muted-foreground'>Loading pool…</p>
      </div>
    );
  }

  const pairLabel = `${poolData.token0.symbol} / ${poolData.token1.symbol}`;
  const expectedLpFormatted = formatTokenAmount({
    value: expectedLp,
    expo: LP_EXPO,
  });
  const minLpFormatted = formatTokenAmount({
    value: minAmountOutDeposit,
    expo: LP_EXPO,
  }) ?? '0';
  const minWithdraw0Formatted = formatTokenAmount({
    value: minAmountOutWithdraw0,
    expo: poolData.token0.decimals,
  }) ?? '0';
  const minWithdraw1Formatted = formatTokenAmount({
    value: minAmountOutWithdraw1,
    expo: poolData.token1.decimals,
  }) ?? '0';
  const withdrawReceiveFormatted = formatTokenAmount({ value: lpAmount, expo: LP_EXPO })
    ?? '0';

  return (
    <div className='flex flex-col gap-5 p-8'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <div className='flex -space-x-2'>
            <span className='inline-block rounded-full border-2 border-background bg-muted'>
              <AssetIcon symbol={poolData.token0.symbol} size={28} />
            </span>
            <span className='inline-block rounded-full border-2 border-background bg-muted'>
              <AssetIcon symbol={poolData.token1.symbol} size={28} />
            </span>
          </div>
          <span className='font-semibold text-lg'>
            {mode === 'Withdraw' ? `Withdraw from ${pairLabel}` : pairLabel}
          </span>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleClose}
          className='h-8 w-8 rounded-full shrink-0'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex rounded-lg bg-muted/50 p-1'>
        <button
          type='button'
          onClick={() => {
            setMode('Deposit');
            clearForm();
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'Deposit'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Deposit
        </button>
        <button
          type='button'
          onClick={() => {
            setMode('Withdraw');
            clearForm();
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'Withdraw'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Withdraw
        </button>
      </div>

      {mode === 'Deposit' && (
        <>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-medium text-muted-foreground'>
              Deposit amounts
            </p>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>
          <div className='space-y-3'>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>
                {poolData.token0.symbol}
              </p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={typeof amount0Str === 'string' ? amount0Str : ''}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onDepositAmount0Change(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: balance0 ?? 0n,
                      expo: poolData.token0.decimals,
                    })} {poolData.token0.symbol}
                  </span>
                  <span className='rounded-full'>
                    <AssetIcon symbol={poolData.token0.symbol} size={24} />
                  </span>
                </div>
              </div>
            </div>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>
                {poolData.token1.symbol}
              </p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={typeof amount1Str === 'string' ? amount1Str : ''}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onDepositAmount1Change(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: balance1 ?? 0n,
                      expo: poolData.token1.decimals,
                    })} {poolData.token1.symbol}
                  </span>
                  <span className='rounded-full'>
                    <AssetIcon symbol={poolData.token1.symbol} size={24} />
                  </span>
                </div>
              </div>
            </div>
            <div className='flex gap-2 mt-2'>
              {PERCENTAGES.map((n) => (
                <Button
                  key={n}
                  variant={depositPct === n ? 'default' : 'outline'}
                  size='sm'
                  className='flex-1 rounded-lg text-xs'
                  onClick={() => setDepositPercentage(n)}
                >
                  {n}%
                </Button>
              ))}
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Deposit percentage</span>
              <span className='font-medium'>{depositPct}%</span>
            </div>
            <div className='h-2 rounded-full bg-muted'>
              <div
                className='h-full rounded-full bg-primary transition-all'
                style={{ width: `${depositPct}%` }}
              />
            </div>
          </div>
          <div className='rounded-xl border border-input bg-muted/30 p-3 space-y-2'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              You receive (min)
            </p>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground'>LP</span>
              </div>
              <span>{minLpFormatted}</span>
            </div>
            {expectedLpFormatted != null
              && expectedLpFormatted !== minLpFormatted && (
              <p className='text-xs text-muted-foreground'>
                Expected: {expectedLpFormatted}
              </p>
            )}
          </div>
          {inputError && <p className='text-sm text-destructive'>{inputError}</p>}
          <div className='rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-2'>
            <Info className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex justify-between w-full text-sm'>
              <span className='text-muted-foreground'>Pool Share</span>
              <span>{poolShareDisplay}</span>
            </div>
          </div>
          <Button
            onClick={writeDeposit}
            disabled={isDepositLoading || (amount0 === 0n && amount1 === 0n)}
            className='w-full rounded-lg h-12 text-base'
            size='lg'
          >
            {isDepositLoading ? <Loader className='h-5 w-5 animate-spin' /> : (
              'Deposit'
            )}
          </Button>
        </>
      )}

      {mode === 'Withdraw' && (
        <>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-medium text-muted-foreground'>
              Withdraw amount
            </p>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>
          <div className='space-y-3'>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>Amount</p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={typeof lpAmountStr === 'string' ? lpAmountStr : ''}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onWithdrawInputChange(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: lpBalance ?? 0n,
                      expo: LP_EXPO,
                    })} LP
                  </span>
                  <span className='rounded-full'>
                    <AssetIcon symbol={poolData.token0.symbol} size={24} />
                  </span>
                </div>
              </div>
              <div className='flex gap-2 mt-2'>
                {PERCENTAGES.map((n) => (
                  <Button
                    key={n}
                    variant={withdrawPct === n ? 'default' : 'outline'}
                    size='sm'
                    className='flex-1 rounded-lg text-xs'
                    onClick={() => setWithdrawPercentage(n)}
                  >
                    {n}%
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Withdraw percentage</span>
              <span className='font-medium'>{withdrawPct}%</span>
            </div>
            <div className='h-2 rounded-full bg-muted'>
              <div
                className='h-full rounded-full bg-primary transition-all'
                style={{ width: `${withdrawPct}%` }}
              />
            </div>
          </div>
          <div className='rounded-xl border border-input bg-muted/30 p-3 space-y-2'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              You receive (min)
            </p>
            <p className='text-xs text-muted-foreground'>
              LP: {withdrawReceiveFormatted}
            </p>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={poolData.token0.symbol} size={20} />
                <span>{poolData.token0.symbol}</span>
              </div>
              <span>
                {formatTokenAmount({
                  value: expectedWithdraw0,
                  expo: poolData.token0.decimals,
                })} (min: {minWithdraw0Formatted})
              </span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={poolData.token1.symbol} size={20} />
                <span>{poolData.token1.symbol}</span>
              </div>
              <span>
                {formatTokenAmount({
                  value: expectedWithdraw1,
                  expo: poolData.token1.decimals,
                })} (min: {minWithdraw1Formatted})
              </span>
            </div>
          </div>
          <div className='rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-2'>
            <Info className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex justify-between w-full text-sm'>
              <span className='text-muted-foreground'>
                Remaining pool share
              </span>
              <span>{withdrawPoolShareDisplay}</span>
            </div>
          </div>
          <div className='rounded-lg border border-primary/40 bg-primary/5 p-3 flex gap-2'>
            <AlertTriangle className='h-5 w-5 text-primary shrink-0 mt-0.5' />
            <div className='text-sm'>
              <p className='font-medium text-foreground mb-1'>
                Impermanent Loss Notice
              </p>
              <p className='text-muted-foreground'>
                Withdrawing now realizes any impermanent loss or gain. Your position may
                have experienced IL since deposit. If you deposited at a different price
                ratio, you may receive fewer tokens than expected.
              </p>
            </div>
          </div>
          {inputError && <p className='text-sm text-destructive'>{inputError}</p>}
          <Button
            onClick={writeWithdraw}
            disabled={isWithdrawLoading || lpAmount === 0n}
            className='w-full rounded-lg h-12 text-base'
            size='lg'
          >
            {isWithdrawLoading ? <Loader className='h-5 w-5 animate-spin' /> : (
              'Confirm Withdraw'
            )}
          </Button>
        </>
      )}

      {(isDepositLoading || isWithdrawLoading) && lpProgressStep !== null && (
        <ProgressBar
          steps={LP_PROGRESS_STEPS}
          currentStepIndex={lpProgressStep}
          title='Progress'
        />
      )}
      {lastLpAction && (
        <div className='rounded-xl border border-border bg-card'>
          <div className='px-3 py-2 border-b border-border bg-muted/30'>
            <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              Last {lastLpAction.type.toLowerCase()}
            </span>
          </div>
          <div className='p-4 space-y-4'>
            <div className='flex items-center gap-3 flex-wrap'>
              {lastLpAction.type === 'Deposit'
                ? (
                  <>
                    <div className='flex items-center gap-2 min-w-0'>
                      <AssetIcon symbol={lastLpAction.token0Symbol} size={28} />
                      <span className='font-semibold tabular-nums'>
                        {formatTokenAmount({
                          value: lastLpAction.amount0,
                          expo: lastLpAction.token0Decimals,
                        })}
                      </span>
                      <span className='text-muted-foreground text-sm'>
                        {lastLpAction.token0Symbol}
                      </span>
                    </div>
                    <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground' />
                    <div className='flex items-center gap-2 min-w-0'>
                      <AssetIcon symbol={lastLpAction.token1Symbol} size={28} />
                      <span className='font-semibold tabular-nums'>
                        {formatTokenAmount({
                          value: lastLpAction.amount1,
                          expo: lastLpAction.token1Decimals,
                        })}
                      </span>
                      <span className='text-muted-foreground text-sm'>
                        {lastLpAction.token1Symbol}
                      </span>
                    </div>
                  </>
                )
                : (
                  <>
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='font-semibold tabular-nums'>
                        {lastLpAction.lpAmount != null
                          ? formatTokenAmount({ value: lastLpAction.lpAmount, expo: 0 })
                          : '—'}
                      </span>
                      <span className='text-muted-foreground text-sm'>LP</span>
                    </div>
                    <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground' />
                    <div className='flex items-center gap-2 min-w-0'>
                      <AssetIcon symbol={lastLpAction.token0Symbol} size={28} />
                      <span className='font-semibold tabular-nums'>
                        {formatTokenAmount({
                          value: lastLpAction.amount0,
                          expo: lastLpAction.token0Decimals,
                        })}
                      </span>
                      <span className='text-muted-foreground text-sm'>
                        {lastLpAction.token0Symbol}
                      </span>
                    </div>
                    <span className='text-muted-foreground'>+</span>
                    <div className='flex items-center gap-2 min-w-0'>
                      <AssetIcon symbol={lastLpAction.token1Symbol} size={28} />
                      <span className='font-semibold tabular-nums'>
                        {formatTokenAmount({
                          value: lastLpAction.amount1,
                          expo: lastLpAction.token1Decimals,
                        })}
                      </span>
                      <span className='text-muted-foreground text-sm'>
                        {lastLpAction.token1Symbol}
                      </span>
                    </div>
                  </>
                )}
            </div>
            <div className='flex flex-wrap gap-3 pt-2 border-t border-border'>
              <a
                href={getMidenscanNoteUrl(lastLpAction.noteId)}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1.5 text-sm text-primary hover:underline'
              >
                <span className='font-mono text-muted-foreground'>
                  Note {lastLpAction.noteId.slice(0, 8)}…{lastLpAction.noteId.slice(-6)}
                </span>
                <ExternalLink className='h-3.5 w-3.5 shrink-0' />
              </a>
              {lastLpAction.txId && (
                <a
                  href={getMidenscanTxUrl(lastLpAction.txId)}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 text-sm text-primary hover:underline'
                >
                  <span className='font-mono text-muted-foreground'>
                    Tx {lastLpAction.txId.slice(0, 8)}…{lastLpAction.txId.slice(-6)}
                  </span>
                  <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {(depositError || withdrawError) && (
        <p className='text-sm text-destructive'>
          {depositError ?? withdrawError}
        </p>
      )}
    </div>
  );
}
