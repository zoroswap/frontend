import type { PoolBalance } from '@/hooks/usePoolsBalances';
import type { PoolInfo } from '@/hooks/usePoolsInfo';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { formalBigIntFormat, prettyBigintFormat } from '@/utils/format';
import { useWallet } from '@demox-labs/miden-wallet-adapter';
import AssetIcon from './AssetIcon';
import Price from './Price';
import { Button } from './ui/button';

const LiquidityPoolRow = ({
  pool,
  tokenConfig,
  poolBalances,
  managePool,
  className,
  lpBalance,
}: {
  pool: PoolInfo;
  poolBalances: PoolBalance;
  tokenConfig?: TokenConfig;
  lpBalance: bigint;
  managePool: (pool: PoolInfo) => void;
  className?: string;
}) => {
  const { connected: isConnected } = useWallet();
  const decimals = pool.decimals;

  const saturation =
    ((poolBalances.reserve * BigInt(1e8)) / poolBalances.totalLiabilities)
    / BigInt(1e6);

  return (
    <tr className={className}>
      <td>
        <div className='flex items-center gap-3'>
          <AssetIcon symbol={pool.symbol} size={48} />
          <div>
            <h4 className='text-sm font-bold'>{pool.name}</h4>
            <p className='text-xs opacity-50'>
              ${tokenConfig && <Price tokenConfig={tokenConfig} />}
            </p>
          </div>
        </div>
      </td>
      <td className='opacity-50'>n / a</td>
      <td className='px-4 py-3'>
        {prettyBigintFormat({ value: poolBalances.totalLiabilities, expo: decimals })}
        {' '}
        <span className='opacity-50'>
          / Inf
        </span>
      </td>
      <td>
        {formalBigIntFormat({
          val: saturation,
          expo: 0,
          round: 2,
        })} %
      </td>
      {
        /*<td className={styles.green}>
        {pool.apr24h === 0 ? '<0.01' : pool.apr24h} <small>%</small> /{' '}
        {pool.apr7d === 0 ? '<0.01' : pool.apr7d} <small>%</small>
      </td>*/
      }
      <td
        className={`${!lpBalance || lpBalance < BigInt(10000) ? 'opacity-70' : ''}`}
      >
        {prettyBigintFormat({ value: lpBalance, expo: decimals })}{'  '}
        <small>z{pool.symbol}</small>
      </td>
      <td className='max-w-[100px] sticky box-border text-right'>
        <Button
          onClick={() => {
            managePool(pool);
          }}
          size='sm'
          disabled={!isConnected}
        >
          Manage
        </Button>
      </td>
    </tr>
  );
};

export default LiquidityPoolRow;
