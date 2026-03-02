import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { prettyBigintFormat } from '@/utils/format';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

const LiquidityPoolRow = ({
  pool,
  poolBalances,
  managePool,
  className,
  lpBalance,
  variant = 'manage',
  onRowClick,
}: {
  pool: PoolInfo;
  tokenConfig?: TokenConfig;
  poolBalances: PoolBalance;
  lpBalance: bigint;
  managePool: (pool: PoolInfo) => void;
  className?: string;
  variant?: 'manage' | 'addLiquidity';
  onRowClick?: (pool: PoolInfo) => void;
}) => {
  const { connected: isConnected } = useUnifiedWallet();
  const decimals = pool.decimals;
  const feeTier = feeTierForSymbol(pool.symbol);
  const tvlFormatted = prettyBigintFormat({
    value: poolBalances.totalLiabilities,
    expo: decimals,
  });

  const isRowClickable = variant === 'addLiquidity' && onRowClick;

  if (variant === 'addLiquidity') {
    return (
      <tr
        className={`border-b border-border ${className ?? ''} ${isRowClickable ? 'cursor-pointer hover:bg-muted/30' : ''}`}
        role={isRowClickable ? 'button' : undefined}
        tabIndex={isRowClickable ? 0 : undefined}
        onClick={isRowClickable ? () => onRowClick?.(pool) : undefined}
        onKeyDown={
          isRowClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(pool);
                }
              }
            : undefined
        }
      >
        <td className='py-3 px-4'>
          <div className='flex items-center gap-2'>
            <div className='flex -space-x-2'>
              <span className='inline-block rounded-full border-2 border-card overflow-hidden'>
                <AssetIcon symbol={pool.symbol} size={24} />
              </span>
              <span className='inline-block rounded-full border-2 border-card overflow-hidden bg-muted'>
                <AssetIcon symbol='USDC' size={24} />
              </span>
            </div>
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
