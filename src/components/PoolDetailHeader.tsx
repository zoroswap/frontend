import { Button } from '@/components/ui/button';
import { truncateId } from '@/lib/format';
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PoolDetailHeaderProps {
  pairLabel: string;
  feeTier: string;
  poolIdBech32: string;
  onAddLiquidity: () => void;
  onWithdraw: () => void;
  hasPosition: boolean;
  /** Single icon (HF) or stacked pair (XYK). */
  headerIcons: ReactNode;
}

export function PoolDetailHeader({
  pairLabel,
  feeTier,
  poolIdBech32,
  onAddLiquidity,
  onWithdraw,
  hasPosition,
  headerIcons,
}: PoolDetailHeaderProps) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-4 mb-8'>
      <div className='flex items-center gap-3'>
        {headerIcons}
        <div>
          <h1 className='text-2xl font-bold font-cal-sans'>{pairLabel}</h1>
          <div className='flex items-center gap-2 text-sm text-muted-foreground mt-0.5'>
            <span>{feeTier}</span>
            <span>·</span>
            <a
              href='https://testnet.midenscan.com'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 hover:text-foreground'
            >
              {truncateId(poolIdBech32)}
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
          </div>
        </div>
      </div>
      <div className='flex gap-2'>
        <Button size='lg' className='rounded-lg' onClick={onAddLiquidity}>
          Add Liquidity
        </Button>
        <Button
          size='lg'
          variant='outline'
          className='rounded-lg'
          onClick={onWithdraw}
          disabled={!hasPosition}
        >
          Withdraw
        </Button>
      </div>
    </div>
  );
}
