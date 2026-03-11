import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalContext } from '@/providers/ModalContext';
import { formatTokenAmount } from '@/lib/format';
import { useXykDeposit } from '@/hooks/useXykDeposit';
import { useXykLpBalance } from '@/hooks/useXykLpBalance';
import { useXykPool } from '@/hooks/useXykPool';
import { X } from 'lucide-react';
import { useCallback, useContext, useState } from 'react';
import { parseUnits } from 'viem';

export interface XykPoolModalProps {
  poolId: string;
  onSuccess?: (noteId: string) => void;
  onClose?: () => void;
  initialMode?: 'Deposit' | 'Withdraw';
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
  const { deposit, isLoading: isDepositLoading } = useXykDeposit(poolId);

  const [mode] = useState<'Deposit' | 'Withdraw'>(initialMode);
  const [amount0Str, setAmount0Str] = useState('');
  const [amount1Str, setAmount1Str] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();

  const handleClose = useCallback(() => {
    modalContext.closeModal();
    onClose?.();
  }, [modalContext, onClose]);

  const handleDeposit = useCallback(async () => {
    if (!poolData) return;
    let amount0: bigint;
    let amount1: bigint;
    try {
      amount0 = parseUnits(amount0Str || '0', poolData.token0.decimals);
      amount1 = parseUnits(amount1Str || '0', poolData.token1.decimals);
    } catch {
      setInputError('Invalid amounts');
      return;
    }
    if (amount0 <= 0n && amount1 <= 0n) {
      setInputError('Enter amounts');
      return;
    }
    setInputError(undefined);
    const result = await deposit(amount0, amount1);
    refetchLpBalance();
    handleClose();
    if (result?.noteId && onSuccess) onSuccess(result.noteId);
  }, [
    poolData,
    amount0Str,
    amount1Str,
    deposit,
    refetchLpBalance,
    handleClose,
    onSuccess,
  ]);

  if (poolLoading || !poolData) {
    return (
      <div className='bg-background border border-border rounded-xl shadow-lg max-w-md w-full p-6'>
        <p className='text-muted-foreground'>Loading pool…</p>
      </div>
    );
  }

  const pairLabel = `${poolData.token0.symbol} / ${poolData.token1.symbol}`;

  return (
    <div className='bg-background border border-border rounded-xl shadow-lg max-w-md w-full p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold'>{pairLabel}</h2>
        <button
          type='button'
          onClick={handleClose}
          className='p-1 rounded hover:bg-muted text-muted-foreground'
          aria-label='Close'
        >
          <X className='h-5 w-5' />
        </button>
      </div>

      {mode === 'Deposit' ? (
        <div className='space-y-4'>
          <div>
            <label className='text-xs text-muted-foreground uppercase tracking-wide'>
              {poolData.token0.symbol}
            </label>
            <div className='flex items-center gap-2 mt-1'>
              <Input
                type='text'
                inputMode='decimal'
                placeholder='0'
                value={amount0Str}
                onChange={(e) => setAmount0Str(e.target.value)}
                className='flex-1'
              />
              <div className='flex items-center gap-1'>
                <AssetIcon symbol={poolData.token0.symbol} size={20} />
                <span className='text-sm font-medium'>
                  {poolData.token0.symbol}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className='text-xs text-muted-foreground uppercase tracking-wide'>
              {poolData.token1.symbol}
            </label>
            <div className='flex items-center gap-2 mt-1'>
              <Input
                type='text'
                inputMode='decimal'
                placeholder='0'
                value={amount1Str}
                onChange={(e) => setAmount1Str(e.target.value)}
                className='flex-1'
              />
              <div className='flex items-center gap-1'>
                <AssetIcon symbol={poolData.token1.symbol} size={20} />
                <span className='text-sm font-medium'>
                  {poolData.token1.symbol}
                </span>
              </div>
            </div>
          </div>
          {inputError && (
            <p className='text-sm text-destructive'>{inputError}</p>
          )}
          <Button
            className='w-full rounded-lg'
            onClick={handleDeposit}
            disabled={isDepositLoading}
          >
            {isDepositLoading ? 'Adding…' : 'Add Liquidity'}
          </Button>
        </div>
      ) : (
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            Your LP balance:{' '}
            {formatTokenAmount({
              value: lpBalance,
              expo: 18,
            }) ?? '0'}
          </p>
          <p className='text-sm text-muted-foreground'>
            Withdraw liquidity — coming soon.
          </p>
        </div>
      )}
    </div>
  );
}
