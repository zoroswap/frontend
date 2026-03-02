import { useDeposit } from '@/hooks/useDeposit';
import { useWithdraw } from '@/hooks/useWithdraw';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { NoteType } from '@miden-sdk/miden-sdk';
import { ChevronDown, Info, Loader, AlertTriangle, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useBalance } from '../hooks/useBalance';
import { type PoolInfo } from '../hooks/usePoolsInfo';
import { ModalContext } from '../providers/ModalContext';
import { formatTokenAmount } from '../utils/format';
import type { LpDetails, TxResult } from './OrderStatus';
import AssetIcon from './AssetIcon';
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
  const [rawValue, setRawValue] = useState(BigInt(0));
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');
  const [withdrawPct, setWithdrawPct] = useState(100);

  const token = useMemo(
    () =>
      Object.values(tokens).find((t) => t.faucetIdBech32 === pool.faucetIdBech32),
    [tokens, pool.faucetIdBech32],
  );
  const quoteToken = useMemo(
    () => Object.values(tokens).find((t) => t.symbol === 'USDC'),
    [tokens],
  );
  const { balance: balanceToken, refetch: refetchBalanceToken } = useBalance({
    token,
  });
  const { balance: balanceQuote } = useBalance({ token: quoteToken ?? undefined });
  const balance =
    mode === 'Withdraw' ? lpBalance ?? BigInt(0) : balanceToken ?? BigInt(0);
  const decimals = pool.decimals;

  const clearForm = useCallback(() => {
    setInputValue('');
    setRawValue(BigInt(0));
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
      const txResult =
        mode === 'Deposit'
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

  const writeDeposit = useCallback(async () => {
    if (token == null) return;
    await deposit({
      amount: rawValue,
      minAmountOut: BigInt(1),
      token,
      noteType: NoteType.Public,
    });
  }, [rawValue, deposit, token]);

  const writeWithdraw = useCallback(async () => {
    if (token == null) return;
    await withdraw({
      amount: rawValue,
      minAmountOut: BigInt(1),
      token,
      noteType: NoteType.Public,
    });
  }, [rawValue, withdraw, token]);

  const setAmountPercentage = useCallback(
    (percentage: number) => {
      const newValue = (BigInt(percentage) * balance) / BigInt(100);
      setRawValue(newValue);
      setInputError(undefined);
      setInputValue(
        (formatTokenAmount({ value: newValue, expo: decimals }) ?? '').toString(),
      );
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
        if (mode === 'Withdraw') setWithdrawPct(0);
        return;
      }
      const parsed = parseUnits(val, decimals);
      const validationError = validateValue(parsed, balance);
      if (validationError) setInputError(validationError);
      else {
        setInputError(undefined);
        setRawValue(parsed);
        if (mode === 'Withdraw' && balance > BigInt(0)) {
          const pct = Number((parsed * BigInt(100)) / balance);
          setWithdrawPct(Math.min(100, Math.max(0, pct)));
        }
      }
    },
    [decimals, balance, mode],
  );

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

  const isHfAmm = pool.poolType === 'hfAMM';
  const poolLabel = pool.name || (isHfAmm ? `${pool.symbol}` : `${pool.symbol} / USDC`);
  const withdrawReceiveAmount = rawValue;
  const withdrawReceiveFormatted = formatTokenAmount({
    value: withdrawReceiveAmount,
    expo: decimals,
  });
  const totalValueUsd = '—';

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
          <div className='space-y-1'>
            <p className='text-sm font-medium text-muted-foreground'>
              Deposit amounts
            </p>
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
                    Balance:{' '}
                    {formatTokenAmount({
                      value: balanceToken,
                      expo: pool.decimals,
                    })}{' '}
                    {pool.symbol}
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
                    variant='outline'
                    size='sm'
                    className='flex-1 rounded-lg text-xs'
                    onClick={() => setAmountPercentage(n)}
                  >
                    {n}%
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex justify-center'>
              <ChevronDown className='h-5 w-5 text-muted-foreground' />
            </div>
            <div className='rounded-xl border border-input bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground mb-1'>Amount</p>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-lg'>0.00</span>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <span>
                    Balance:{' '}
                    {formatTokenAmount({
                      value: balanceQuote,
                      expo: quoteToken?.decimals ?? 6,
                    })}{' '}
                    USDC
                  </span>
                  <AssetIcon symbol='USDC' size={24} />
                </div>
              </div>
            </div>
          </div>
          {inputError && (
            <p className='text-sm text-destructive'>{inputError}</p>
          )}
          <div className='rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-2'>
            <Info className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex justify-between w-full text-sm'>
              <span className='text-muted-foreground'>Pool Share</span>
              <span>~0.01%</span>
            </div>
            <div className='flex justify-between w-full text-sm'>
              <span className='text-muted-foreground'>Est. APR</span>
              <span className='text-green-600 font-medium'>24.5%</span>
            </div>
          </div>
          <Button
            onClick={writeDeposit}
            disabled={rawValue === BigInt(0)}
            className='w-full rounded-lg h-12 text-base'
            size='lg'
          >
            {isDepositLoading ? (
              <Loader className='h-5 w-5 animate-spin' />
            ) : (
              'Deposit'
            )}
          </Button>
        </>
      )}

      {mode === 'Withdraw' && (
        <>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-medium text-muted-foreground'>
                Withdraw amount
              </p>
              <span className='text-lg font-semibold'>{withdrawPct}%</span>
            </div>
            <div className='h-2 rounded-full bg-muted overflow-hidden'>
              <div
                className='h-full rounded-full bg-primary transition-all'
                style={{ width: `${withdrawPct}%` }}
              />
            </div>
            <div className='flex gap-2'>
              {PERCENTAGES.map((n) => (
                <Button
                  key={n}
                  variant={withdrawPct === n ? 'default' : 'outline'}
                  size='sm'
                  className='flex-1 rounded-lg'
                  onClick={() => setAmountPercentage(n)}
                >
                  {n}%
                </Button>
              ))}
            </div>
          </div>
          <div className='rounded-xl border border-input bg-muted/30 p-3 space-y-2'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              You&apos;ll receive
            </p>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={pool.symbol} size={20} />
                <span>{pool.symbol}</span>
              </div>
              <span>{withdrawReceiveFormatted ?? '0'}</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol='USDC' size={20} />
                <span>USDC</span>
              </div>
              <span>—</span>
            </div>
            <div className='flex justify-between text-sm pt-1 border-t border-border'>
              <span className='text-muted-foreground'>Total Value</span>
              <span className='font-medium'>${totalValueUsd}</span>
            </div>
          </div>
          <div className='rounded-lg border border-primary/40 bg-primary/5 p-3 flex gap-2'>
            <AlertTriangle className='h-5 w-5 text-primary shrink-0 mt-0.5' />
            <div className='text-sm'>
              <p className='font-medium text-foreground mb-1'>
                Impermanent Loss Notice
              </p>
              <p className='text-muted-foreground'>
                Withdrawing now realizes any impermanent loss. Your position may
                have experienced IL since deposit. If you deposited at a
                different price ratio, you may receive fewer tokens than
                expected.
              </p>
            </div>
          </div>
          <div className='space-y-1 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Unclaimed Fees</span>
              <span className='text-green-600'>+$0.00</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Network Fee</span>
              <span className='text-muted-foreground'>—</span>
            </div>
          </div>
          <Button
            onClick={writeWithdraw}
            disabled={rawValue === BigInt(0)}
            className='w-full rounded-lg h-12 text-base'
            size='lg'
          >
            {isWithdrawLoading ? (
              <Loader className='h-5 w-5 animate-spin' />
            ) : (
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
