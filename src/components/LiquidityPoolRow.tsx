import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { prettyBigintFormat } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TokenConfig } from '@/providers/ZoroProvider';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

/** Saturation = (reserve / total_liabilities) as percentage (can exceed 100) */
function getSaturationPercent(poolBalances: PoolBalance): number | null {
  const { reserve, totalLiabilities } = poolBalances;
  if (totalLiabilities === BigInt(0)) return null;
  return (Number(reserve) / Number(totalLiabilities)) * 100;
}

const LiquidityPoolRow = ({
  pool,
  poolBalances,
  managePool,
  className,
  lpBalance,
  variant = 'manage',
  onRowClick,
  showSaturation = false,
}: {
  pool: PoolInfo;
  tokenConfig?: TokenConfig;
  poolBalances: PoolBalance;
  lpBalance: bigint;
  managePool: (pool: PoolInfo) => void;
  className?: string;
  variant?: 'manage' | 'addLiquidity';
  onRowClick?: (pool: PoolInfo) => void;
  showSaturation?: boolean;
}) => {
  const { connected: isConnected } = useUnifiedWallet();
  const decimals = pool.decimals;
  const feeTier = feeTierForSymbol(pool.symbol);
  const tvlFormatted = prettyBigintFormat({
    value: poolBalances.totalLiabilities,
    expo: decimals,
  });
  const isHfAmm = pool.poolType === 'hfAMM';

  const isRowClickable = variant === 'addLiquidity' && onRowClick;

  const saturationPercent = getSaturationPercent(poolBalances);
  const saturationColor = saturationPercent != null
    ? getSaturationColorClass(saturationPercent)
    : '';

  if (variant === 'addLiquidity') {
    return (
      <tr
        className={`border-b border-border ${className ?? ''} ${
          isRowClickable ? 'cursor-pointer hover:bg-muted/30' : ''
        }`}
        role={isRowClickable ? 'button' : undefined}
        tabIndex={isRowClickable ? 0 : undefined}
        onClick={isRowClickable ? () => onRowClick?.(pool) : undefined}
        onKeyDown={isRowClickable
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick?.(pool);
            }
          }
          : undefined}
      >
        <td className='py-3 px-4'>
          <div className='flex items-center gap-2'>
            {isHfAmm
              ? (
                <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
                  <AssetIcon symbol={pool.symbol} size={24} />
                </span>
              )
              : (
                <div className='flex -space-x-2'>
                  <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
                    <AssetIcon symbol={pool.symbol} size={24} />
                  </span>
                  <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
                    <AssetIcon symbol='USDC' size={24} />
                  </span>
                </div>
              )}
            <div className='flex items-center gap-1.5 flex-wrap'>
              <span className='font-medium'>{pool.name}</span>
              {pool.poolType && (
                <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                  {pool.poolType}
                </span>
              )}
              <span className='text-xs text-muted-foreground'>{feeTier}</span>
            </div>
          </div>
        </td>
        <td className='py-3 px-4'>${tvlFormatted}</td>
        {showSaturation && (
          <td className='py-3 px-4'>
            {saturationPercent != null
              ? (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[72px] px-2 py-1 rounded-md border text-xs font-medium',
                    saturationColor,
                  )}
                  title='Saturation (reserve / total liabilities)'
                >
                  {saturationPercent.toFixed(2)}%
                </span>
              )
              : <span className='text-muted-foreground'>—</span>}
          </td>
        )}
        <td className='py-3 px-4 text-green-600'>—</td>
        <td className='py-3 px-4'>—</td>
        <td className='py-3 px-4'>—</td>
        <td
          className='py-3 px-4 text-right sticky right-0 bg-card'
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => managePool(pool)}
            size='sm'
            disabled={!isConnected}
            className='rounded-lg'
          >
            Add Liquidity
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-border ${className ?? ''}`}>
      <td className='py-3 px-4'>
        <div className='flex items-center gap-3'>
          <AssetIcon symbol={pool.symbol} size={48} />
          <div>
            <h4 className='text-sm font-bold'>{pool.name}</h4>
          </div>
        </div>
      </td>
      <td className='py-3 px-4'>${tvlFormatted}</td>
      <td className='py-3 px-4 opacity-50'>n / a</td>
      <td className='py-3 px-4'>—</td>
      <td className='py-3 px-4'>—</td>
      <td className='py-3 px-4'>
        {prettyBigintFormat({ value: lpBalance, expo: decimals })}{' '}
        <small className='text-muted-foreground'>z{pool.symbol}</small>
      </td>
      <td className='py-3 px-4 text-right'>
        <Button
          onClick={() => managePool(pool)}
          size='sm'
          disabled={!isConnected}
          className='rounded-lg'
        >
          Manage
        </Button>
      </td>
    </tr>
  );
};

export default LiquidityPoolRow;

function getSaturationColorClass(pct: number) {
  if (pct < 15 || pct > 185) return 'text-red-600 border-red-600/30 bg-red-500/10';
  if ((pct >= 15 && pct < 30) || (pct >= 170 && pct <= 185)) {
    return 'text-yellow-600 border-yellow-600/30 bg-yellow-500/10';
  }
  if (pct >= 30 && pct < 170) return 'text-green-600 border-green-600/30 bg-green-500/10';
  return 'text-muted-foreground border-border bg-muted/30';
}
