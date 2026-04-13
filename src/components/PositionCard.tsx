import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { formatUsd, prettyBigintFormat } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useOraclePrices } from '@/providers/OracleContext';
import { useMemo } from 'react';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface PositionCardProps {
  pool: PoolInfo;
  poolBalance: PoolBalance;
  lpBalance: bigint;
  feeTier?: string;
  variant?: 'slim' | 'full';
  onDeposit: () => void;
  onWithdraw: () => void;
  disabled?: boolean;
}

export function PositionCard({
  pool,
  poolBalance,
  lpBalance,
  feeTier = '0.30%',
  variant = 'full',
  onDeposit,
  onWithdraw,
  disabled = false,
}: PositionCardProps) {
  const decimals = pool.decimals;
  const isHfAmm = pool.poolType === 'hfAMM';
  const oraclePrices = useOraclePrices(pool.oracleId ? [pool.oracleId] : []);
  const price = pool.oracleId ? oraclePrices[pool.oracleId]?.value : undefined;
  const positionUsd = useMemo(() => {
    if (
      !isHfAmm || price == null || price === 0
      || poolBalance.totalLiabilities === BigInt(0)
    ) {
      return null;
    }
    const valueInAsset = (lpBalance * poolBalance.reserve) / poolBalance.totalLiabilities;
    const valueHuman = Number(valueInAsset) / 10 ** decimals;
    return valueHuman * price;
  }, [
    isHfAmm,
    price,
    lpBalance,
    poolBalance.reserve,
    poolBalance.totalLiabilities,
    decimals,
  ]);
  const liquidityFormatted = prettyBigintFormat({
    value: lpBalance,
    expo: decimals,
  });
  const tvlFormatted = prettyBigintFormat({
    value: poolBalance.totalLiabilities,
    expo: decimals,
  });
  const isSlim = variant === 'slim';

  return (
    <Card
      className={isSlim
        ? 'rounded-lg border bg-card overflow-hidden'
        : 'rounded-xl border bg-card overflow-hidden'}
    >
      <CardContent className={isSlim ? 'p-3' : 'p-5'}>
        <div className={cn('flex items-center gap-2', isSlim ? 'mb-2' : 'mb-4')}>
          {isHfAmm
            ? (
              <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
                <AssetIcon symbol={pool.symbol} size={isSlim ? 20 : 24} />
              </span>
            )
            : (
              <div className='flex -space-x-2'>
                <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
                  <AssetIcon symbol={pool.symbol} size={isSlim ? 20 : 24} />
                </span>
                <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
                  <AssetIcon symbol='USDC' size={isSlim ? 20 : 24} />
                </span>
              </div>
            )}
          <span className={cn('font-semibold text-foreground', isSlim && 'text-sm')}>
            {pool.name}
          </span>
          {isHfAmm && (
            <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium'>
              hfAMM
            </span>
          )}
          <span className='text-xs text-muted-foreground'>{feeTier}</span>
        </div>
        <div className={cn('space-y-2 text-sm', isSlim && 'space-y-1 text-xs')}>
          {!isSlim && (
            <>
              <div className='flex justify-between'>
                <span className='text-muted-foreground uppercase tracking-wide text-xs'>
                  Liquidity
                </span>
                <span className='font-medium'>${tvlFormatted}</span>
              </div>
              {isHfAmm && positionUsd != null && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground uppercase tracking-wide text-xs'>
                    Value
                  </span>
                  <span className='font-medium'>{formatUsd(positionUsd)}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-muted-foreground uppercase tracking-wide text-xs'>
                  Fees earned
                </span>
                <span className='font-medium text-green-600'>$0.00</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{pool.symbol}</span>
                <span className='font-medium'>{liquidityFormatted}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>USDC</span>
                <span className='font-medium'>—</span>
              </div>
            </>
          )}
          {isSlim && (
            <>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Your deposit</span>
                <span className='font-medium'>{liquidityFormatted}</span>
              </div>
              {isHfAmm && positionUsd != null && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Value</span>
                  <span className='font-medium'>{formatUsd(positionUsd)}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className={cn('flex gap-2', isSlim ? 'mt-2' : 'mt-4')}>
          <Button
            size='sm'
            className={cn(
              'flex-1 rounded-lg bg-primary text-primary-foreground',
              isSlim && 'h-8 text-xs',
            )}
            onClick={onDeposit}
            disabled={disabled}
          >
            Deposit
          </Button>
          <Button
            size='sm'
            variant='secondary'
            className={cn(
              'flex-1 rounded-lg bg-foreground text-background hover:bg-foreground/90',
              isSlim && 'h-8 text-xs',
            )}
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
