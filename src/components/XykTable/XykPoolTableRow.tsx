import { useXykPool } from '@/hooks/useXykPool';
import type { XykPool } from '@/hooks/useXykPools';
import { prettyBigintFormat } from '@/lib/format';
import { accountIdToBech32 } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssetIcon from '../AssetIcon';
import { Skeleton } from '../ui/skeleton';

const truncateId = (bech32: string, head = 6, tail = 4) =>
  bech32.length <= head + tail
    ? bech32
    : `${bech32.slice(0, head)}…${bech32.slice(-tail)}`;

export interface XykPoolTableRowProps {
  pool: XykPool;
  /** Token0 symbol if known (e.g. from config); otherwise fallback to truncated id */
  token0Symbol?: string;
  /** Token1 symbol if known */
  token1Symbol?: string;
}

const XykPoolTableRow = ({ pool, token0Symbol, token1Symbol }: XykPoolTableRowProps) => {
  const navigate = useNavigate();
  const poolIdBech32 = useMemo(() => accountIdToBech32(pool.xykPoolId), [pool.xykPoolId]);
  const { data: poolData, isLoading } = useXykPool(poolIdBech32);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isLoading, hasLoadedOnce]);

  const fallbackId0 = accountIdToBech32(pool.token0);
  const fallbackId1 = accountIdToBech32(pool.token1);

  const sym0 = poolData?.token0.symbol ?? token0Symbol;
  const sym1 = poolData?.token1.symbol ?? token1Symbol;
  const label0 = sym0 ?? truncateId(fallbackId0);
  const label1 = sym1 ?? truncateId(fallbackId1);
  const pairLabel = `${label0} / ${label1}`;

  const reserve0Str = poolData
    ? prettyBigintFormat({ value: poolData.reserve0, expo: poolData.token0.decimals })
    : '—';
  const reserve1Str = poolData
    ? prettyBigintFormat({ value: poolData.reserve1, expo: poolData.token1.decimals })
    : '—';

  const priceDisplay = poolData && poolData.priceToken0InToken1 > 0
    ? `1 ${poolData.token0.symbol} = ${
      poolData.priceToken0InToken1.toFixed(6)
    } ${poolData.token1.symbol}`
    : '—';

  const onOpen = () => {
    navigate(`/pools/xyk/${encodeURIComponent(poolIdBech32)}`);
  };

  const showInitialSkeleton = !hasLoadedOnce && isLoading && !poolData;
  if (showInitialSkeleton) return <XykPoolTableRowSkeleton />;

  return (
    <tr
      className='border-b border-border cursor-pointer hover:bg-muted/30'
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className='py-3 px-4'>
        <div className='flex items-center gap-2'>
          <div className='flex -space-x-2'>
            <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
              <AssetIcon symbol={sym0 ?? 'ANY'} size={24} />
            </span>
            <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
              <AssetIcon symbol={sym1 ?? 'ANY'} size={24} />
            </span>
          </div>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='font-medium'>{pairLabel}</span>
            {isLoading && (
              <span className='inline-flex items-center text-muted-foreground'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              </span>
            )}
          </div>
        </div>
      </td>
      <td className='py-3 px-4'>
        {isLoading && !poolData
          ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          : (
            <>
              <span className='tabular-nums'>{reserve0Str}</span>
              {sym0
                ? <span className='text-muted-foreground text-xs ml-1'>{sym0}</span>
                : null}
              <span className='text-muted-foreground text-xs mx-1'>/</span>
              <span className='tabular-nums'>{reserve1Str}</span>
              {sym1
                ? <span className='text-muted-foreground text-xs ml-1'>{sym1}</span>
                : null}
            </>
          )}
      </td>
      <td className='py-3 px-4'>
        {isLoading && !poolData
          ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          : <span className='text-muted-foreground'>{priceDisplay}</span>}
      </td>
      <td className='py-3 px-4 text-green-600'>
        {isLoading && !poolData ? <Loader2 className='h-4 w-4 animate-spin' /> : '—'}
      </td>
      <td className='py-3 px-4'>
        {isLoading && !poolData
          ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          : '—'}
      </td>
      <td className='py-3 px-4'>
        {isLoading && !poolData
          ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          : '—'}
      </td>
    </tr>
  );
};

export const XykPoolTableRowSkeleton = () => (
  <tr className='border-b border-border'>
    <td className='py-3 px-4'>
      <div className='flex items-center gap-2'>
        <div className='flex -space-x-2'>
          <Skeleton className='h-6 w-6 rounded-full border-2 border-card' />
          <Skeleton className='h-6 w-6 rounded-full border-2 border-card' />
        </div>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-5 w-10 rounded-full' />
        </div>
      </div>
    </td>
    <td className='py-3 px-4'>
      <Skeleton className='h-4 w-40' />
    </td>
    <td className='py-3 px-4'>
      <Skeleton className='h-4 w-44' />
    </td>
    <td className='py-3 px-4'>
      <Skeleton className='h-4 w-12' />
    </td>
    <td className='py-3 px-4'>
      <Skeleton className='h-4 w-12' />
    </td>
    <td className='py-3 px-4'>
      <Skeleton className='h-4 w-12' />
    </td>
  </tr>
);

export default XykPoolTableRow;
