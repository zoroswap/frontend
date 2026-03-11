import { useDeposit } from '@/hooks/useDeposit';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { useWithdraw } from '@/hooks/useWithdraw';
import { DEFAULT_SLIPPAGE } from '@/lib/config';
import { formatTokenAmount, formatUsd } from '@/lib/format';
import { useOraclePrices } from '@/providers/OracleContext';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { NoteType } from '@miden-sdk/miden-sdk';
import { AlertTriangle, Info, Loader, X } from 'lucide-react';
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
  /** For hfAMM: LP symbol is "z" + underlying (e.g. zETH → ETH). Use underlying token for deposit/withdraw. */
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
  const { balance: balanceToken, refetch: refetchBalanceToken } = useBalance({
    token,
  });
  const { balance: balanceQuote } = useBalance({ token: quoteToken ?? undefined });
  const { balance: balanceUnderlying } = useBalance({
    token: underlyingToken ?? undefined,
  });
  const isHfAmm = pool.poolType === 'hfAMM';
  const balance = mode === 'Withdraw'
    ? lpBalance ?? BigInt(0)
    : isHfAmm
    ? (balanceUnderlying ?? balanceQuote ?? BigInt(0))
    : (balanceToken ?? BigInt(0));
  const decimals = mode === 'Deposit' && isHfAmm
    ? (underlyingToken?.decimals ?? quoteToken?.decimals ?? 6)
    : pool.decimals;
  const depositWithdrawToken = isHfAmm ? (underlyingToken ?? quoteToken ?? token) : token;

  const clearForm = useCallback(() => {
    setInputValue('');
    setRawValue(BigInt(0));
    setDepositPct(100);
    setWithdrawPct(100);
    refetchBalanceToken().catch(console.error);
    refetchPoolInfo?.();
  }, [refetchBalanceToken, refetchPoolInfo]);

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
        (formatTokenAmount({ value: newValue, expo: decimals }) ?? '').toString(),
      );
      if (mode === 'Deposit') setDepositPct(percentage);
      if (mode === 'Withdraw') setWithdrawPct(percentage);
    },
    [decimals, balance, mode],
  );

  const onInputChange = useCallback(
    (val: string) => {
      setInputValue(val);
      if (val === '') {
        setInputError(undefined);
        setRawValue(BigInt(0));
        if (mode === 'Deposit') setDepositPct(0);
        if (mode === 'Withdraw') setWithdrawPct(0);
        return;
      }
      const parsed = parseUnits(val, decimals);
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

  useEffect(() => {
    if (mode === 'Deposit' && balance > BigInt(0)) {
      const newValue = (BigInt(depositPct) * balance) / BigInt(100);
      setRawValue(newValue);
      setInputValue(
        (formatTokenAmount({ value: newValue, expo: decimals }) ?? '').toString(),
      );
    }
  }, [depositPct, mode, balance, decimals]);

  useEffect(() => {
    if (mode === 'Withdraw' && balance > BigInt(0)) {
      const newValue = (BigInt(withdrawPct) * balance) / BigInt(100);
      setRawValue(newValue);
      setInputValue(
        (formatTokenAmount({ value: newValue, expo: decimals }) ?? '').toString(),
      );
    }
  }, [withdrawPct, mode, balance, decimals]);

  const handleClose = useCallback(() => modalContext.closeModal(), [modalContext]);

  const poolLabel = pool.name || (isHfAmm ? `${pool.symbol}` : `${pool.symbol} / USDC`);
  const withdrawReceiveAmount = rawValue;
  const withdrawReceiveFormatted = formatTokenAmount({
    value: withdrawReceiveAmount,
    expo: decimals,
  });
  // Withdraw: (lp_token / lp_total_supply) * total_liabilities = asset amount out (use totalLiabilities)
  const withdrawAssetOut = useMemo(() => {
    if (!poolBalance || poolBalance.totalLiabilities === BigInt(0)) {
      return BigInt(0);
    }
    const lpTotalSupply = poolBalance.totalLiabilities;
    return (rawValue * lpTotalSupply) / lpTotalSupply;
  }, [poolBalance, rawValue]);
  const assetDecimals = isHfAmm
    ? (underlyingToken?.decimals ?? quoteToken?.decimals ?? 6)
    : decimals;
  const withdrawAssetOutFormatted =
    formatTokenAmount({ value: withdrawAssetOut, expo: assetDecimals }) ?? '0';
  const totalValueUsd = useMemo(() => {
    if (!isHfAmm) return null;
    const oracleId = underlyingToken?.oracleId ?? quoteToken?.oracleId ?? pool.oracleId;
    const price = oracleId ? oraclePrices[oracleId]?.value : undefined;
    if (price == null || price === 0) return null;
    const amount = mode === 'Deposit' ? rawValue : withdrawAssetOut;
    const expo = underlyingToken?.decimals ?? quoteToken?.decimals ?? 6;
    const value = Number(amount) / 10 ** expo;
    const usd = value * price;
    return usd;
  }, [
    isHfAmm,
    mode,
    underlyingToken,
    quoteToken,
    pool.oracleId,
    oraclePrices,
    rawValue,
    withdrawAssetOut,
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
    <div className='flex flex-col gap-5'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          {isHfAmm
            ? (
              <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                <AssetIcon symbol={pool.symbol} size={28} />
              </span>
            )
            : (
              <div className='flex -space-x-2'>
                <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                  <AssetIcon symbol={pool.symbol} size={28} />
                </span>
                <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                  <AssetIcon symbol='USDC' size={28} />
                </span>
              </div>
            )}
          <span className='font-semibold text-lg'>
            {mode === 'Withdraw' ? `Withdraw from ${poolLabel}` : poolLabel}
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
              {isHfAmm ? 'Deposit amount' : 'Deposit amounts'}
            </p>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>
          <div className='space-y-3'>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>Amount</p>
              <div className='flex items-center justify-between gap-2'>
                <Input
                  value={inputValue}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onInputChange(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: balance,
                      expo: decimals,
                    })}{' '}
                    {isHfAmm
                      ? (underlyingToken?.symbol ?? underlyingSymbol)
                      : pool.symbol}
                  </span>
                  <span className='rounded-full overflow-hidden'>
                    <AssetIcon
                      symbol={isHfAmm
                        ? (underlyingToken?.symbol ?? underlyingSymbol)
                        : pool.symbol}
                      size={24}
                    />
                  </span>
                </div>
              </div>
              <div className='flex gap-2 mt-2'>
                {PERCENTAGES.map((n) => (
                  <Button
                    key={n}
                    variant={depositPct === n ? 'default' : 'outline'}
                    size='sm'
                    className='flex-1 rounded-lg text-xs'
                    onClick={() => setAmountPercentage(n)}
                  >
                    {n}%
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Deposit percentage</span>
              <span className='font-medium'>{depositPct}%</span>
            </div>
            <div className='h-2 rounded-full bg-muted overflow-hidden'>
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
                <AssetIcon
                  symbol={isHfAmm
                    ? (pool.symbol.startsWith('z') ? pool.symbol : `z${pool.symbol}`)
                    : pool.symbol}
                  size={20}
                />
                <span>
                  {isHfAmm
                    ? (pool.symbol.startsWith('z') ? pool.symbol : `z${pool.symbol}`)
                    : pool.symbol}
                </span>
              </div>
              <span>{minLpFormatted ?? '0.00'}</span>
            </div>
            {expectedLpFormatted != null && expectedLpFormatted !== (minLpFormatted ?? '0.00') && (
              <p className='text-xs text-muted-foreground'>Expected: {expectedLpFormatted}</p>
            )}
            {isHfAmm && (
              <div className='flex justify-between text-sm pt-1 border-t border-border'>
                <span className='text-muted-foreground'>Total Value</span>
                <span className='font-medium'>{formatUsd(totalValueUsd)}</span>
              </div>
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
            disabled={rawValue === BigInt(0)}
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
                  value={inputValue}
                  placeholder='0.00'
                  className='border-0 bg-transparent p-0 h-auto text-lg focus-visible:ring-0'
                  onChange={(e) => onInputChange(e.target.value)}
                />
                <div className='flex items-center gap-2 text-sm text-muted-foreground shrink-0'>
                  <span>
                    Balance: {formatTokenAmount({
                      value: lpBalance,
                      expo: decimals,
                    })} {isHfAmm
                      ? (pool.symbol.startsWith('z') ? pool.symbol : `z${pool.symbol}`)
                      : 'LP'}
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
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Withdraw percentage</span>
              <span className='font-medium'>{withdrawPct}%</span>
            </div>
            <div className='h-2 rounded-full bg-muted overflow-hidden'>
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
            {isHfAmm
              ? (
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
              )
              : (
                <>
                  <p className='text-xs text-muted-foreground'>LP: {withdrawReceiveFormatted ?? '0'}</p>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <AssetIcon symbol={pool.symbol} size={20} />
                      <span>{pool.symbol}</span>
                    </div>
                    <span>{withdrawAssetOutFormatted} (min: {minWithdrawAssetFormatted})</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <AssetIcon symbol='USDC' size={20} />
                      <span>USDC</span>
                    </div>
                    <span>—</span>
                  </div>
                </>
              )}
            {isHfAmm && (
              <div className='flex justify-between text-sm pt-1 border-t border-border'>
                <span className='text-muted-foreground'>Total Value</span>
                <span className='font-medium'>{formatUsd(totalValueUsd)}</span>
              </div>
            )}
          </div>
          <div className='rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-2'>
            <Info className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex justify-between w-full text-sm'>
              <span className='text-muted-foreground'>Remaining pool share</span>
              <span>{withdrawPoolShareDisplay}</span>
            </div>
          </div>
          {!isHfAmm && (
            <div className='rounded-lg border border-primary/40 bg-primary/5 p-3 flex gap-2'>
              <AlertTriangle className='h-5 w-5 text-primary shrink-0 mt-0.5' />
              <div className='text-sm'>
                <p className='font-medium text-foreground mb-1'>
                  Impermanent Loss Notice
                </p>
                <p className='text-muted-foreground'>
                  Withdrawing now realizes any impermanent loss. Your position may have
                  experienced IL since deposit. If you deposited at a different price
                  ratio, you may receive fewer tokens than expected.
                </p>
              </div>
            </div>
          )}
          <Button
            onClick={writeWithdraw}
            disabled={rawValue === BigInt(0)}
            className='w-full rounded-lg h-12 text-base'
            size='lg'
          >
            {isWithdrawLoading ? <Loader className='h-5 w-5 animate-spin' /> : (
              'Confirm Withdraw'
            )}
          </Button>
        </>
      )}

      {(depositError || withdrawError) && (
        <p className='text-sm text-destructive'>
          {depositError ?? withdrawError}
        </p>
      )}
    </div>
  );
}
