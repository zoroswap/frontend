import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { prettyBigintFormat } from '@/utils/format';
import { X } from 'lucide-react';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';

interface PoolDetailViewProps {
  pool: PoolInfo;
  poolBalance: PoolBalance;
  lpBalance: bigint;
  onAddLiquidity: () => void;
  onWithdraw: () => void;
  onClose: () => void;
}

export function PoolDetailView({
  pool,
  poolBalance,
  lpBalance,
  onAddLiquidity,
  onWithdraw,
  onClose,
}: PoolDetailViewProps) {
  const decimals = pool.decimals;
  const tvlFormatted = prettyBigintFormat({
    value: poolBalance.totalLiabilities,
    expo: decimals,
  });
  const hasPosition = lpBalance > BigInt(0);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex -space-x-2'>
            <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
              <AssetIcon symbol={pool.symbol} size={32} />
            </span>
            <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
              <AssetIcon symbol='USDC' size={32} />
            </span>
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='font-semibold text-lg'>{pool.name}</h2>
              {pool.poolType && (
                <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                  {pool.poolType}
                </span>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>
              {pool.symbol} / USDC
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={onClose}
          className='h-8 w-8 rounded-full shrink-0'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-xl border border-border bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            TVL
          </p>
          <p className='font-semibold'>${tvlFormatted}</p>
        </div>
        <div className='rounded-xl border border-border bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            APR
          </p>
          <p className='font-semibold text-green-600'>—</p>
        </div>
        <div className='rounded-xl border border-border bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            1D VOL
          </p>
          <p className='font-semibold'>—</p>
        </div>
        <div className='rounded-xl border border-border bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            7D VOL
          </p>
          <p className='font-semibold'>—</p>
        </div>
      </div>

      {hasPosition && (
        <div className='rounded-xl border border-border bg-muted/20 p-3'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            Your position
          </p>
          <p className='font-medium'>
            {prettyBigintFormat({ value: lpBalance, expo: decimals })}{' '}
            <span className='text-muted-foreground'>z{pool.symbol}</span>
          </p>
        </div>
      )}

      <div className='flex flex-col gap-2'>
        <Button
          onClick={onAddLiquidity}
          className='w-full rounded-lg h-11'
          size='lg'
        >
          Add Liquidity
        </Button>
        {hasPosition && (
          <Button
            onClick={onWithdraw}
            variant='outline'
            className='w-full rounded-lg h-11 border-foreground/30'
            size='lg'
          >
            Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}
