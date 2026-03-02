import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { prettyBigintFormat } from '@/utils/format';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface PositionCardProps {
  pool: PoolInfo;
  poolBalance: PoolBalance;
  lpBalance: bigint;
  feeTier?: string;
  onDeposit: () => void;
  onWithdraw: () => void;
  disabled?: boolean;
}

export function PositionCard({
  pool,
  lpBalance,
  feeTier = '0.30%',
  onDeposit,
  onWithdraw,
  disabled = false,
}: PositionCardProps) {
  const decimals = pool.decimals;
  const liquidityFormatted = prettyBigintFormat({
    value: lpBalance,
    expo: decimals,
  });

  return (
    <Card className='rounded-xl border bg-card overflow-hidden'>
      <CardContent className='p-5'>
        <div className='flex items-center gap-2 mb-4'>
          <div className='flex -space-x-2'>
            <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
              <AssetIcon symbol={pool.symbol} size={24} />
            </span>
            <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
              <AssetIcon symbol='USDC' size={24} />
            </span>
          </div>
          <span className='font-semibold text-foreground'>{pool.name}</span>
          {pool.poolType && (
            <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
              {pool.poolType}
            </span>
          )}
          <span className='text-xs text-muted-foreground'>{feeTier}</span>
        </div>
        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground uppercase tracking-wide'>Your deposit</span>
            <span className='font-medium'>{liquidityFormatted}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground uppercase tracking-wide'>Fees earned</span>
            <span className='font-medium text-green-600'>—</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>{pool.symbol}</span>
            <span className='font-medium'>{liquidityFormatted}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>USDC</span>
            <span className='font-medium'>—</span>
          </div>
        </div>
        <div className='flex gap-2 mt-4'>
          <Button
            size='sm'
            className='flex-1 rounded-lg'
            onClick={onDeposit}
            disabled={disabled}
          >
            Deposit
          </Button>
          <Button
            size='sm'
            variant='secondary'
            className='flex-1 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90'
            onClick={onWithdraw}
            disabled={disabled}
          >
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
