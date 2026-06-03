import { useDeposit } from '@/hooks/useDeposit';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { useWithdraw } from '@/hooks/useWithdraw';
import { DEFAULT_SLIPPAGE } from '@/lib/config';
import { formatTokenAmount, formatTokenAmountForInput, formatUsd } from '@/lib/format';
import { useOraclePrices } from '@/providers/OracleContext';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { NoteType } from '@miden-sdk/miden-sdk';
import { Loader, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useBalance } from '../hooks/useBalance';
import { type PoolInfo } from '../hooks/usePoolsInfo';
import { ModalContext } from '../providers/ModalContext';
import AssetIcon from './AssetIcon';
import type { LpDetails, TxResult } from './OrderStatus';
import Slippage from './Slippage';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PoolModalProps {
  pool: PoolInfo;
  refetchPoolInfo?: () => void;
  setTxResult: (txResults: TxResult) => void;
  setLpDetails: (lpDetails: LpDetails) => void;
  onSuccess: (noteId: string) => void;
  lpBalance: bigint;
  initialMode?: LpActionType;
}

const validateValue = (val: bigint, max: bigint) =>
  val > max ? 'Amount too large' : val <= BigInt(0) ? 'Invalid value' : undefined;

export type LpActionType = 'Deposit' | 'Withdraw';

const PERCENTAGES = [25, 50, 75, 100] as const;

export default function PoolModal({
  pool,
  refetchPoolInfo,
  setTxResult,
  setLpDetails,
  onSuccess,
  lpBalance,
  initialMode = 'Deposit',
}: PoolModalProps) {
  const modalContext = useContext(ModalContext);
  const { tokens } = useContext(ZoroContext);
  const [mode, setMode] = useState<LpActionType>(initialMode);
  const [slippage, setSlippage] = useState<number>(DEFAULT_SLIPPAGE);
  const [rawValue, setRawValue] = useState(BigInt(0));
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');
  const [depositPct, setDepositPct] = useState(100);
  const [withdrawPct, setWithdrawPct] = useState(100);

  const { data: poolBalancesData } = usePoolsBalances();
  const poolBalance = useMemo(
    () =>
      poolBalancesData?.find((b) => b.faucetIdBech32 === pool.faucetIdBech32)
        ?? null,
    [poolBalancesData, pool.faucetIdBech32],
  );

  const token = useMemo(
    () => Object.values(tokens).find((t) => t.faucetIdBech32 === pool.faucetIdBech32),
    [tokens, pool.faucetIdBech32],
  );
  const quoteToken = useMemo(
    () => Object.values(tokens).find((t) => t.symbol === 'USDC'),
    [tokens],
  );
  /** LP symbol is "z" + underlying (e.g. zETH → ETH). Deposits use the underlying token. */
  const lpSymbol = pool.symbol.startsWith('z') ? pool.symbol : `z${pool.symbol}`;
  const underlyingSymbol = pool.symbol.startsWith('z')
    ? pool.symbol.slice(1)
    : pool.symbol;
  const underlyingToken = useMemo(
    () =>
      Object.values(tokens).find((t) => t.symbol === underlyingSymbol) ?? quoteToken
        ?? null,
    [tokens, underlyingSymbol, quoteToken],
  );
  const oracleIds = useMemo(
    () =>
      [pool.oracleId, underlyingToken?.oracleId, quoteToken?.oracleId].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    [pool.oracleId, underlyingToken?.oracleId, quoteToken?.oracleId],
  );
  const oraclePrices = useOraclePrices(oracleIds);
  const { balance: balanceQuote } = useBalance({ token: quoteToken ?? undefined });
  const { balance: balanceUnderlying, refetch: refetchBalanceUnderlying } = useBalance({
    token: underlyingToken ?? undefined,
  });
  const underlyingDecimals = underlyingToken?.decimals ?? quoteToken?.decimals ?? 6;
  const balance = mode === 'Withdraw'
    ? lpBalance ?? BigInt(0)
    : (balanceUnderlying ?? balanceQuote ?? BigInt(0));
  const decimals = mode === 'Deposit' ? underlyingDecimals : pool.decimals;
  const depositWithdrawToken = underlyingToken ?? quoteToken ?? token;

  const clearForm = useCallback(() => {
    setInputValue('');
    setRawValue(BigInt(0));
    setDepositPct(100);
    setWithdrawPct(100);
    refetchBalanceUnderlying().catch(console.error);
    refetchPoolInfo?.();
  }, [refetchBalanceUnderlying, refetchPoolInfo]);

  const {
    deposit,
    isLoading: isDepositLoading,
    error: depositError,
    txId: depositTxId,
    noteId: depositNoteId,
  } = useDeposit();
  const {
    withdraw,
    isLoading: isWithdrawLoading,
    error: withdrawError,
    txId: withdrawTxId,
    noteId: withdrawNoteId,
  } = useWithdraw();

  useEffect(() => {
    if ((depositNoteId && depositTxId) || (withdrawTxId && withdrawNoteId)) {
      setLpDetails({
        token: token as TokenConfig,
        amount: rawValue,
        actionType: mode,
      });
      const txResult = mode === 'Deposit'
        ? { txId: depositTxId, noteId: depositNoteId }
        : { txId: withdrawTxId, noteId: withdrawNoteId };
      setTxResult(txResult);
      clearForm();
      onSuccess(txResult.noteId as string);
      modalContext.closeModal();
    }
  }, [
    depositTxId,
    withdrawTxId,
    depositNoteId,
    withdrawNoteId,
    mode,
    clearForm,
    modalContext,
    token,
    rawValue,
    setLpDetails,
    setTxResult,
    onSuccess,
  ]);

  const setAmountPercentage = useCallback(
    (percentage: number) => {
      const newValue = (BigInt(percentage) * balance) / BigInt(100);
      setRawValue(newValue);
      setInputError(undefined);
      setInputValue(
        formatTokenAmountForInput({ value: newValue, expo: decimals }),
      );
      if (mode === 'Deposit') setDepositPct(percentage);
      if (mode === 'Withdraw') setWithdrawPct(percentage);
    },
    [decimals, balance, mode],
  );

  const onInputChange = useCallback(
    (val: string) => {
      const s = typeof val === 'string' ? val : '';
      setInputValue(s);
      if (s === '') {
        setInputError(undefined);
        setRawValue(BigInt(0));
        if (mode === 'Deposit') setDepositPct(0);
        if (mode === 'Withdraw') setWithdrawPct(0);
        return;
      }
      const parsed = parseUnits(s, decimals);
      const validationError = validateValue(parsed, balance);
      if (validationError) setInputError(validationError);
      else {
        setInputError(undefined);
        setRawValue(parsed);
        if (balance > BigInt(0)) {
          const pct = Number((parsed * BigInt(100)) / balance);
          const clamped = Math.min(100, Math.max(0, pct));
          if (mode === 'Deposit') setDepositPct(clamped);
          if (mode === 'Withdraw') setWithdrawPct(clamped);
        }
      }
    },
    [decimals, balance, mode],
  );

  const handleClose = useCallback(() => modalContext.closeModal(), [modalContext]);

  const poolLabel = pool.name || pool.symbol;
  // Withdraw: (lp_token / lp_total_supply) * total_liabilities = asset amount out (use totalLiabilities)
  const withdrawAssetOut = useMemo(() => {
    if (!poolBalance || poolBalance.totalLiabilities === BigInt(0)) {
      return BigInt(0);
    }
    const lpTotalSupply = poolBalance.totalLiabilities;
    return (rawValue * lpTotalSupply) / lpTotalSupply;
  }, [poolBalance, rawValue]);
  const assetDecimals = underlyingDecimals;
  const totalValueUsd = useMemo(() => {
    const oracleId = underlyingToken?.oracleId ?? quoteToken?.oracleId ?? pool.oracleId;
    const price = oracleId ? oraclePrices[oracleId]?.value : undefined;
    if (price == null || price === 0) return null;
    const amount = mode === 'Deposit' ? rawValue : withdrawAssetOut;
    const value = Number(amount) / 10 ** assetDecimals;
    return value * price;
  }, [
    mode,
    underlyingToken,
    quoteToken,
    pool.oracleId,
    oraclePrices,
    rawValue,
    withdrawAssetOut,
    assetDecimals,
  ]);

  // Deposit: LP amount uses total_liabilities (not reserve)
  const expectedLp = useMemo(() => {
    if (
      !poolBalance || poolBalance.totalLiabilities === BigInt(0) || rawValue === BigInt(0)
    ) {
      return BigInt(0);
    }
    return (rawValue * poolBalance.totalLiabilities) / poolBalance.totalLiabilities;
  }, [poolBalance, rawValue]);

  const expectedLpFormatted = formatTokenAmount({
    value: expectedLp,
    expo: decimals,
  });

  // Pool share (deposit): use total_liabilities, share = expectedLp / (totalLiabilities + expectedLp)
  const poolSharePct = useMemo(() => {
    if (!poolBalance || rawValue === BigInt(0)) return null;
    const tl = poolBalance.totalLiabilities;
    const newTotalLp = tl + expectedLp;
    if (newTotalLp === BigInt(0)) return null;
    const pct = (Number(expectedLp) / Number(newTotalLp)) * 100;
    return pct;
  }, [poolBalance, rawValue, expectedLp]);
  const poolShareDisplay = poolSharePct != null
    ? poolSharePct < 0.01
      ? `${poolSharePct.toFixed(6)}%`
      : `${poolSharePct.toFixed(2)}%`
    : '—';

  /** After withdraw: your new share = (your LP - withdrawn) / (total LP supply - withdrawn). */
  const withdrawPoolSharePct = useMemo(() => {
    if (!poolBalance || rawValue === BigInt(0)) return null;
    const totalSupply = poolBalance.totalLiabilities;
    const totalAfter = totalSupply - rawValue;
    if (totalAfter <= BigInt(0)) return null;
    const userAfter = lpBalance >= rawValue ? lpBalance - rawValue : BigInt(0);
    const pct = (Number(userAfter) / Number(totalAfter)) * 100;
    const clamped = Math.min(100, Math.max(0, pct));
    return clamped;
  }, [poolBalance, rawValue, lpBalance]);
  const withdrawPoolShareDisplay = withdrawPoolSharePct != null
    ? withdrawPoolSharePct < 0.01
      ? `${withdrawPoolSharePct.toFixed(6)}%`
      : `${withdrawPoolSharePct.toFixed(2)}%`
    : '—';

  const minAmountOutDeposit = useMemo(() => {
    if (expectedLp === BigInt(0)) return BigInt(1);
    const slippageMultiplier = BigInt(Math.round((100 - slippage) * 1e6));
    const min = (expectedLp * slippageMultiplier) / BigInt(1e8);
    return min > BigInt(0) ? min : BigInt(1);
  }, [expectedLp, slippage]);

  const minAmountOutWithdraw = useMemo(() => {
    if (
      !poolBalance || poolBalance.totalLiabilities === BigInt(0) || rawValue === BigInt(0)
    ) {
      return BigInt(1);
    }
    const estimatedAssetOut = (rawValue * poolBalance.totalLiabilities)
      / poolBalance.totalLiabilities;
    if (estimatedAssetOut === BigInt(0)) return BigInt(1);
    const slippageMultiplier = BigInt(Math.round((100 - slippage) * 1e6));
    const min = (estimatedAssetOut * slippageMultiplier) / BigInt(1e8);
    return min > BigInt(0) ? min : BigInt(1);
  }, [poolBalance, rawValue, slippage]);

  const minLpFormatted = formatTokenAmount({
    value: minAmountOutDeposit,
    expo: decimals,
  }) ?? '0';
  const minWithdrawAssetFormatted =
    formatTokenAmount({ value: minAmountOutWithdraw, expo: assetDecimals }) ?? '0';

  const writeDeposit = useCallback(async () => {
    if (depositWithdrawToken == null) return;
    await deposit({
      amount: rawValue,
      minAmountOut: minAmountOutDeposit,
      token: depositWithdrawToken,
      noteType: NoteType.Public,
    });
  }, [rawValue, minAmountOutDeposit, deposit, depositWithdrawToken]);

  const writeWithdraw = useCallback(async () => {
    if (token == null) return;
    await withdraw({
      amount: rawValue,
      minAmountOut: minAmountOutWithdraw,
      token,
      noteType: NoteType.Public,
    });
  }, [rawValue, minAmountOutWithdraw, withdraw, token]);

  return (
    <div className='flex flex-col gap-5 p-8'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
            <AssetIcon symbol={pool.symbol} size={32} />
          </span>
          <span className='font-cal-sans text-lg tracking-tight'>{poolLabel}</span>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleClose}
          className='h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      {/* Tabs */}
      <div className='flex items-center'>
        <div className='flex flex-1 rounded-xl bg-muted p-1'>
          <button
            type='button'
            onClick={() => {
              setMode('Deposit');
              clearForm();
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'Deposit'
                ? 'bg-primary text-primary-foreground shadow-sm'
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
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'Withdraw'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>

      {mode === 'Deposit' && (
        <>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-medium text-muted-foreground'>
              Deposit amount
            </p>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>
          <div className='space-y-3'>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>Amount</p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={typeof inputValue === 'string' ? inputValue : ''}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </div>
            </div>
            <div className='flex items-center justify-end text-sm text-muted-foreground mb-4'>
              <span>
                Balance: {formatTokenAmount({ value: balance, expo: decimals })}{' '}
                {underlyingToken?.symbol ?? underlyingSymbol}
              </span>
            </div>
            <div className='flex gap-2'>
              {PERCENTAGES.map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setAmountPercentage(n)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    depositPct === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border/60 hover:border-foreground/20 hover:text-foreground'
                  }`}
                >
                  {n}%
                </button>
              ))}
            </div>
          </div>

          {inputError && <p className='text-sm text-destructive px-1'>{inputError}</p>}

          {/* Details */}
          <div className='rounded-2xl bg-muted p-4 space-y-3 text-sm'>
            <div className='relative flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Max slippage</span>
              <span className='flex items-center gap-1.5'>
                <Slippage slippage={slippage} onSlippageChange={setSlippage} />
                <span className='font-medium'>{slippage} %</span>
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Balance</span>
              <span className='font-medium'>
                {formatTokenAmount({ value: balance, expo: decimals })}{' '}
                {underlyingToken?.symbol ?? underlyingSymbol}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>My position</span>
              <span className='font-medium'>
                {formatTokenAmount({ value: lpBalance, expo: pool.decimals })} {lpSymbol}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Pool share</span>
              <span className='font-medium'>{poolShareDisplay}</span>
            </div>
          </div>

          {/* Receive row — inline with details */}
          <div className='rounded-2xl bg-muted p-4 space-y-3 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>You receive (min)</span>
              <span className='flex items-center gap-2 font-semibold'>
                {minLpFormatted ?? '0'}{' '}
                <AssetIcon symbol={lpSymbol} size={20} />
              </span>
            </div>
            {expectedLpFormatted != null
              && expectedLpFormatted !== (minLpFormatted ?? '0.00') && (
              <p className='text-xs text-muted-foreground'>
                Expected: {expectedLpFormatted}
              </p>
            )}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Total Value</span>
              <span className='font-medium'>{formatUsd(totalValueUsd)}</span>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={writeDeposit}
            disabled={rawValue === BigInt(0)}
            className='w-full h-14 rounded-2xl font-bold text-base'
            size='lg'
          >
            {isDepositLoading
              ? <Loader className='h-5 w-5 animate-spin' />
              : 'Deposit'}
          </Button>
        </>
      )}

      {mode === 'Withdraw' && (
        <>
          {/* Input card */}
          <div className='rounded-2xl border border-border/50 bg-background p-5'>
            <div className='flex items-center justify-between gap-3 mb-4'>
              <Input
                value={inputValue}
                placeholder='0'
                className='border-0 bg-transparent p-0 h-auto text-4xl font-semibold focus-visible:ring-0 no-spinner placeholder:text-muted-foreground/40 flex-1 min-w-0'
                onChange={(e) => onInputChange(e.target.value)}
              />
              <span className='rounded-full overflow-hidden shrink-0'>
                <AssetIcon symbol={pool.symbol} size={36} />
              </span>
            </div>
            <div className='flex items-center justify-end text-sm text-muted-foreground mb-4'>
              <span>
                Balance: {formatTokenAmount({ value: lpBalance, expo: decimals })}{' '}
                {lpSymbol}
              </span>
            </div>
            <div className='flex gap-2'>
              {PERCENTAGES.map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setAmountPercentage(n)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    withdrawPct === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border/60 hover:border-foreground/20 hover:text-foreground'
                  }`}
                >
                  {n}%
                </button>
              ))}
            </div>
          </div>
          <div className='space-y-3'>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>Amount</p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={typeof inputValue === 'string' ? inputValue : ''}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onInputChange(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: lpBalance,
                      expo: decimals,
                    })} {lpSymbol}
                  </span>
                  <span className='rounded-full overflow-hidden'>
                    <AssetIcon symbol={pool.symbol} size={24} />
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
                    onClick={() => setAmountPercentage(n)}
                  >
                    {n}%
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Balance</span>
              <span className='font-medium'>
                {formatTokenAmount({ value: lpBalance, expo: pool.decimals })} {lpSymbol}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>My position</span>
              <span className='font-medium'>
                {formatTokenAmount({ value: lpBalance, expo: pool.decimals })} {lpSymbol}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Pool share after</span>
              <span className='font-medium'>{withdrawPoolShareDisplay}</span>
            </div>
          </div>
          <div className='rounded-xl border border-input bg-muted/30 p-3 space-y-2'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              You receive (min)
            </p>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <AssetIcon
                  symbol={underlyingToken?.symbol ?? underlyingSymbol}
                  size={20}
                />
                <span>{underlyingToken?.symbol ?? underlyingSymbol}</span>
              </div>
              <span>{minWithdrawAssetFormatted}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-medium'>Total Value</span>
              <span className='font-medium'>{formatUsd(totalValueUsd)}</span>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={writeWithdraw}
            disabled={rawValue === BigInt(0)}
            className='w-full h-14 rounded-2xl font-bold text-base'
            size='lg'
          >
            {isWithdrawLoading
              ? <Loader className='h-5 w-5 animate-spin' />
              : 'Withdraw'}
          </Button>
        </>
      )}

      {(depositError || withdrawError) && (
        <p className='text-sm text-destructive px-1'>
          {depositError ?? withdrawError}
        </p>
      )}
    </div>
  );
}
