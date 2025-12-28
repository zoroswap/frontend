import { useDeposit } from '@/hooks/useDeposit';
import { useWithdraw } from '@/hooks/useWithdraw';
import { ZoroContext } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { Loader, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useBalance } from '../hooks/useBalance';
import { type PoolInfo } from '../hooks/usePoolsInfo';
import { ModalContext } from '../providers/ModalContext';
import { formatTokenAmount } from '../utils/format';
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
}

const validateValue = (val: bigint, max: bigint) => {
  return val > max
    ? 'Amount too large'
    : val <= 0
    ? 'Invalid value'
    : undefined;
};

export type LpActionType = 'Deposit' | 'Withdraw';

const PoolModal = (
  { pool, refetchPoolInfo, setTxResult, setLpDetails, onSuccess, lpBalance }:
    PoolModalProps,
) => {
  const modalContext = useContext(ModalContext);
  const { tokens } = useContext(ZoroContext);
  const [mode, setMode] = useState<LpActionType>('Deposit');
  const [rawValue, setRawValue] = useState(BigInt(0));
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const token = useMemo(
    () => Object.values(tokens).find(t => t.faucetIdBech32 === pool.faucetIdBech32),
    [tokens, pool.faucetIdBech32],
  );
  const { balance: balanceToken, refetch: refetchBalanceToken } = useBalance({
    token,
  });
  const balance = useMemo(
    () =>
      mode === 'Withdraw'
        ? lpBalance ?? BigInt(0)
        : balanceToken ?? BigInt(0),
    [balanceToken, lpBalance, mode],
  );
  const decimals = pool.decimals;

  const clearForm = useCallback(() => {
    setInputValue('');
    setRawValue(BigInt(0));
    refetchBalanceToken().catch(console.error);
    refetchPoolInfo?.();
  }, [
    refetchBalanceToken,
    refetchPoolInfo,
  ]);

  // DEPOSITING
  const {
    deposit,
    isLoading: isDepositLoading,
    error: depositError,
    txId: depositTxId,
    noteId: depositNoteId,
  } = useDeposit();

  // WITHDRAWING
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

  const writeDeposit = useCallback(async () => {
    if (token == null) return;
    await deposit({
      amount: rawValue,
      minAmountOut: rawValue,
      token,
    });
  }, [rawValue, deposit, token]);

  const writeWithdraw = useCallback(async () => {
    if (token == null) return;
    await withdraw({
      amount: rawValue,
      minAmountOut: rawValue,
      token,
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
    },
    [decimals, balance],
  );
  const onInputChange = useCallback((val: string) => {
    setInputValue(val);
    if (val === '') {
      setInputError(undefined);
      setRawValue(BigInt(0));
      return;
    }
    const parsed = parseUnits(val, decimals);
    const validationError = validateValue(parsed, balance);
    if (validationError) {
      setInputError(validationError);
    } else {
      setInputError(undefined);
      setRawValue(parseUnits(val, decimals));
    }
  }, [decimals, balance]);

  const handleClose = useCallback(() => {
    modalContext.closeModal();
  }, [modalContext]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='w-full flex items-center text-xl'>
        <div
          className={`font-bold cursor-pointer p-4
              ${mode === 'Deposit' ? 'opacity-100' : 'opacity-30'}
          `}
          onClick={() => {
            setMode('Deposit');
            clearForm();
          }}
        >
          Deposit
        </div>
        <div
          className={`font-bold cursor-pointer p-4
              ${mode === 'Withdraw' ? 'opacity-100' : 'opacity-30'}
          `}
          onClick={() => {
            setMode('Withdraw');
            clearForm();
          }}
        >
          Withdraw
        </div>
        <div className='flex-grow' />
        <Button
          variant='ghost'
          size='icon'
          onClick={handleClose}
          className='h-6 w-6 rounded-full hover:bg-muted'
        >
          <X className='h-3 w-3' />
        </Button>
      </div>{' '}
      <div className='flex flex-col gap-4 my-4'>
        <p className='text-xs opacity-50'>
          {mode === 'Deposit' ? 'Deposit amount' : 'Withdrawal amount'}
        </p>
        <div className='flex gap-4 relative'>
          <Input
            value={inputValue}
            placeholder='0.0'
            className='border-0 bg-background p-4 py-8 text-2xl'
            onChange={(e) => {
              onInputChange(e.target.value);
            }}
          />
          <div className='text-lg absolute right-[20px] top-[50%] mt-[-12px] opacity-50'>
            {token?.symbol}
          </div>
        </div>
        {inputError ? <p className='text-destructive'>{inputError}</p> : null}
        <div className='flex gap-4 justify-center'>
          {[25, 50, 75, 100].map(n => (
            <Button
              key={n}
              variant='ghost'
              onClick={() => {
                setAmountPercentage(n);
              }}
            >
              {n} %
            </Button>
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <div className='flex justify-between h-[24px]'>
          <p className='opacity-50 font-bold'>Max slippage</p>
          <div className='flex gap-2 items-center'>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
            <span>{slippage} %</span>
          </div>
        </div>
        <p className='flex justify-between  h-[24px]'>
          <span className='opacity-50 font-bold'>Balance</span>
          <span>
            {formatTokenAmount({
              value: balanceToken,
              expo: pool.decimals,
            })} {pool.symbol}
          </span>
        </p>
        <p className='flex justify-between h-[24px]'>
          <span className='opacity-50 font-bold'>My position</span>
          <span>
            {formatTokenAmount({
              value: lpBalance,
              expo: pool.decimals,
            })} z{pool.symbol}
          </span>
        </p>
      </div>
      <div>
        {mode === 'Deposit'
          ? (
            <Button
              onClick={writeDeposit}
              disabled={rawValue === BigInt(0)}
              className='w-full'
              size='xl'
            >
              {isDepositLoading && <Loader className='animate-spin' />}
              {isDepositLoading ? <span>Preparing order</span> : <span>Deposit</span>}
            </Button>
          )
          : null}
        {mode === 'Withdraw'
          ? (
            <Button
              onClick={writeWithdraw}
              disabled={rawValue === BigInt(0)}
              size='xl'
              className='w-full'
            >
              {isWithdrawLoading && <Loader className='animateSpin' />}
              {isWithdrawLoading ? <span>Preparing order</span> : <span>Withdraw</span>}
            </Button>
          )
          : null}
      </div>
      {depositError ? <p className='text-destructive'>{depositError}</p> : null}
      {withdrawError ? <p className='text-destructive'>{withdrawError}</p> : null}
    </div>
  );
};

export default PoolModal;
