import type { PoolBalance } from '@/hooks/usePoolsBalances';
import { type PoolInfo } from '@/hooks/usePoolsInfo';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { useMemo, useState } from 'react';
import LiquidityPoolRow from './LiquidityPoolRow';
import { poweredByMiden } from './PoweredByMiden';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Flame, Clock, Star } from 'lucide-react';

export interface LiquidityPoolsTableProps {
  poolsInfo?: { poolAccountId?: string; liquidityPools?: PoolInfo[] } | null;
  poolBalances?: PoolBalance[] | null;
  lpBalances: Record<string, bigint>;
  tokenConfigs?: (TokenConfig | undefined)[];
  openPoolModal: (pool: PoolInfo) => void;
}

const LiquidityPoolsTable = ({
  poolsInfo,
  poolBalances,
  lpBalances,
  tokenConfigs,
  openPoolModal,
}: LiquidityPoolsTableProps) => {
  const [search, setSearch] = useState('');
  const [poolFilter, setPoolFilter] = useState<'all' | 'hot' | 'new' | 'stables'>('all');

  const filteredPools = useMemo(() => {
    const pools = poolsInfo?.liquidityPools ?? [];
    let list = pools;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.symbol.toLowerCase().includes(q),
      );
    }
    if (poolFilter === 'stables') {
      list = list.filter(p => /USDC|USDT|DAI|BUSD/i.test(p.symbol));
    }
    return list;
  }, [poolsInfo?.liquidityPools, search, poolFilter]);

  return (
    <div className='w-full'>
      <div className='flex flex-wrap items-center gap-3 mb-4'>
        <div className='relative flex-1 min-w-[200px]'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search by token name or pair...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='pl-9 rounded-lg bg-muted/50 border-muted-foreground/20'
          />
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            className={`rounded-lg ${poolFilter === 'hot' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-muted-foreground/20'}`}
            onClick={() => setPoolFilter('hot')}
          >
            <Flame className='h-4 w-4 mr-1' />
            Hot
          </Button>
          <Button
            variant='outline'
            size='sm'
            className={`rounded-lg ${poolFilter === 'new' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-muted-foreground/20'}`}
            onClick={() => setPoolFilter('new')}
          >
            <Clock className='h-4 w-4 mr-1' />
            New
          </Button>
          <Button
            variant='outline'
            size='sm'
            className={`rounded-lg ${poolFilter === 'stables' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-muted-foreground/20'}`}
            onClick={() => setPoolFilter('stables')}
          >
            <Star className='h-4 w-4 mr-1' />
            Stables
          </Button>
        </div>
      </div>

      <Card className='rounded-xl border overflow-hidden'>
        <div className='relative overflow-x-auto'>
          <table className='w-full text-sm text-left text-foreground'>
            <thead>
              <tr className='border-b border-border text-muted-foreground uppercase tracking-wide text-xs'>
                <th className='py-3 px-4 font-medium'>Pool</th>
                <th className='py-3 px-4 font-medium'>TVL ↑</th>
                <th className='py-3 px-4 font-medium'>APR ↑</th>
                <th className='py-3 px-4 font-medium'>1D VOL ↑</th>
                <th className='py-3 px-4 font-medium'>7D VOL ↑</th>
                <th className='py-3 px-4 font-medium text-right sticky right-0 bg-card'> </th>
              </tr>
            </thead>
            <tbody>
              {filteredPools.map(pool => {
                const balances = poolBalances?.find(b => b.faucetIdBech32 === pool.faucetIdBech32);
                const tokenConfig = tokenConfigs?.find(c => c?.faucetIdBech32 === pool.faucetIdBech32);
                return balances
                  ? (
                    <LiquidityPoolRow
                      key={pool.faucetIdBech32}
                      tokenConfig={tokenConfig}
                      pool={pool}
                      poolBalances={balances}
                      managePool={openPoolModal}
                      lpBalance={lpBalances[pool.faucetIdBech32] ?? BigInt(0)}
                      variant='addLiquidity'
                    />
                  )
                  : (
                    <tr key={pool.faucetIdBech32 + '-skeleton'}>
                      <td colSpan={6} className='py-4' />
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className='flex justify-center mt-6'>
        {poweredByMiden}
      </div>
    </div>
  );
};

export default LiquidityPoolsTable;
