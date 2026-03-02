import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OrderStatus, type LpDetails, type TxResult } from '@/components/OrderStatus';
import PoolModal from '@/components/PoolModal';
import type { LpActionType } from '@/components/PoolModal';
import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { ModalContext } from '@/providers/ModalContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { prettyBigintFormat, truncateId } from '@/utils/format';
import { AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

const PLACEHOLDER_TXS = [
  { type: 'Swap' as const, in: '0.5 ETH', out: '1,090 USDC', account: '0x1a2b...3c4d', time: '2 min ago' },
  { type: 'Add' as const, in: '1.0 ETH', out: '2,180 USDC', account: '0x5e6f...7a8b', time: '8 min ago' },
  { type: 'Remove' as const, in: '0.25 ETH', out: '545 USDC', account: '0x9c0d...1e2f', time: '14 min ago' },
  { type: 'Swap' as const, in: '2,500 USDC', out: '1.14 ETH', account: '0x3a4b...5c6d', time: '22 min ago' },
  { type: 'Swap' as const, in: '0.1 ETH', out: '218 USDC', account: '0x7e8f...9a0b', time: '31 min ago' },
];

const TYPE_COLORS: Record<string, string> = {
  Swap: 'text-primary',
  Add: 'text-green-600',
  Remove: 'text-amber-600',
};

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const { data: poolsInfo, refetch: refetchPoolsInfo } = usePoolsInfo();
  const { data: poolBalances } = usePoolsBalances();
  const modalContext = useContext(ModalContext);
  const { tokens } = useContext(ZoroContext);
  const { orderStatus, registerCallback } = useOrderUpdates();
  const lastShownNoteId = useRef<string | undefined>(undefined);
  const [txResult, setTxResult] = useState<undefined | TxResult>();
  const [lpDetails, setLpDetails] = useState<undefined | LpDetails>(undefined);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');

  const tokenConfigs = useMemo(
    () => poolsInfo?.liquidityPools?.map((p) => tokens[p.faucetIdBech32]),
    [tokens, poolsInfo?.liquidityPools],
  );
  const { balances: lpBalances, refetch: refetchLpBalances } = useLPBalances({
    tokens: tokenConfigs,
  });

  const pool = useMemo(() => {
    if (!poolId || !poolsInfo?.liquidityPools) return null;
    return poolsInfo.liquidityPools.find(
      (p) => p.faucetIdBech32 === decodeURIComponent(poolId),
    ) ?? null;
  }, [poolId, poolsInfo?.liquidityPools]);

  const poolBalance = useMemo(() => {
    if (!pool || !poolBalances) return null;
    return poolBalances.find((b) => b.faucetIdBech32 === pool.faucetIdBech32) ?? null;
  }, [pool, poolBalances]);

  const lpBalance = pool ? lpBalances[pool.faucetIdBech32] ?? BigInt(0) : BigInt(0);
  const hasPosition = lpBalance > BigInt(0);

  const openOrderStatusModal = useCallback((noteId: string) => {
    lastShownNoteId.current = noteId;
    setIsSuccessModalOpen(true);
  }, []);

  useEffect(() => {
    if (txResult?.noteId) {
      registerCallback(txResult.noteId, (status) => {
        if (status === 'executed') {
          refetchLpBalances();
        }
      });
    }
  }, [txResult?.noteId, refetchLpBalances, registerCallback]);

  const openPoolModal = useCallback(
    (p: PoolInfo, initialMode?: LpActionType) => {
      modalContext.openModal(
        <PoolModal
          pool={p}
          refetchPoolInfo={refetchPoolsInfo}
          setTxResult={setTxResult}
          setLpDetails={setLpDetails}
          onSuccess={openOrderStatusModal}
          lpBalance={lpBalances[p.faucetIdBech32] ?? BigInt(0)}
          initialMode={initialMode}
        />,
      );
    },
    [modalContext, refetchPoolsInfo, openOrderStatusModal, lpBalances],
  );

  if (!pool || !poolBalance) {
    return (
      <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
        <Header />
        <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
          <p className='text-muted-foreground'>Pool not found.</p>
          <Link to='/explore' className='text-primary hover:underline mt-2 inline-block'>
            ← Back to pools
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const decimals = pool.decimals;
  const feeTier = feeTierForSymbol(pool.symbol);
  const tvlFormatted = prettyBigintFormat({
    value: poolBalance.totalLiabilities,
    expo: decimals,
  });
  const pairLabel = `${pool.symbol} / USDC`;

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>{pairLabel} - ZoroSwap</title>
      <Header />
      <main className='flex-1 w-full max-w-6xl mx-auto px-6 py-8'>
        <Link
          to='/explore'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to pools
        </Link>

        <div className='flex flex-wrap items-start justify-between gap-4 mb-8'>
          <div className='flex items-center gap-3'>
            <div className='flex -space-x-2'>
              <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                <AssetIcon symbol={pool.symbol} size={40} />
              </span>
              <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                <AssetIcon symbol='USDC' size={40} />
              </span>
            </div>
            <div>
              <h1 className='text-2xl font-bold font-cal-sans'>{pairLabel}</h1>
              <div className='flex items-center gap-2 text-sm text-muted-foreground mt-0.5'>
                <span>{feeTier}</span>
                <span>·</span>
                <a
                  href={`https://testnet.midenscan.com`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 hover:text-foreground'
                >
                  {truncateId(pool.faucetIdBech32)}
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
              </div>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button
              size='lg'
              className='rounded-lg'
              onClick={() => openPoolModal(pool, 'Deposit')}
            >
              Add Liquidity
            </Button>
            <Button
              size='lg'
              variant='outline'
              className='rounded-lg'
              onClick={() => openPoolModal(pool, 'Withdraw')}
              disabled={!hasPosition}
            >
              Withdraw
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-8'>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                Total Value Locked
              </p>
              <p className='text-lg font-semibold'>${tvlFormatted}</p>
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                APR (est.)
              </p>
              <p className='text-lg font-semibold text-green-600'>24.5%</p>
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                24H Volume
              </p>
              <p className='text-lg font-semibold'>$12,500</p>
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                24H Fees
              </p>
              <p className='text-lg font-semibold text-green-600'>$37.50</p>
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-1 space-y-6'>
            <Card className='rounded-xl'>
                <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>Pool Composition</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <AssetIcon symbol={pool.symbol} size={24} />
                    <span>{pool.symbol}</span>
                  </div>
                  <div className='text-right'>
                    <p className='font-medium'>21.56</p>
                    <p className='text-xs text-muted-foreground'>$2,180.00</p>
                  </div>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <AssetIcon symbol='USDC' size={24} />
                    <span>USDC</span>
                  </div>
                  <div className='text-right'>
                    <p className='font-medium'>45,020.00</p>
                    <p className='text-xs text-muted-foreground'>$1.00</p>
                  </div>
                </div>
                <div className='h-2 rounded-full bg-muted overflow-hidden flex'>
                  <div className='h-full bg-primary/80 rounded-l-full' style={{ width: '48%' }} />
                  <div className='h-full bg-blue-400/80' style={{ width: '52%' }} />
                </div>
                <p className='text-xs text-muted-foreground'>
                  ETH 48% · USDC 52%
                </p>
              </CardContent>
            </Card>

            <Card className='rounded-xl'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>Pool Info</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Fee Tier</span>
                  <span>{feeTier}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>7D Volume</span>
                  <span>$110,800</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>24h Transactions</span>
                  <span>142</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Liquidity</span>
                  <span>${tvlFormatted}</span>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-xl border-amber-500/30 bg-amber-500/5'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <AlertTriangle className='h-4 w-4 text-amber-600' />
                  IL Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground'>
                  This pool&apos;s tokens have moderate price correlation. Estimated
                  impermanent loss at ±25% price divergence is -5.7%. Consider
                  concentrated ranges carefully.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='lg:col-span-2 space-y-6'>
            <Card className='rounded-xl'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-border text-muted-foreground text-xs uppercase tracking-wide'>
                        <th className='text-left py-3 px-4'>Type</th>
                        <th className='text-left py-3 px-4'>Amount in</th>
                        <th className='text-left py-3 px-4'>Amount out</th>
                        <th className='text-left py-3 px-4'>Account</th>
                        <th className='text-right py-3 px-4'>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PLACEHOLDER_TXS.map((tx, i) => (
                        <tr key={i} className='border-b border-border/50'>
                          <td className={`py-3 px-4 font-medium ${TYPE_COLORS[tx.type] ?? ''}`}>
                            {tx.type}
                          </td>
                          <td className='py-3 px-4'>{tx.in}</td>
                          <td className='py-3 px-4'>{tx.out}</td>
                          <td className='py-3 px-4 font-mono text-muted-foreground'>{tx.account}</td>
                          <td className='py-3 px-4 text-right text-muted-foreground'>{tx.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-xl'>
              <CardHeader className='pb-2 flex flex-row items-center justify-between'>
                <CardTitle className='text-base font-semibold'>Price & TVL</CardTitle>
                <div className='flex gap-1'>
                  {(['1D', '1W', '1M', 'ALL'] as const).map((r) => (
                    <Button
                      key={r}
                      variant={chartRange === r ? 'default' : 'ghost'}
                      size='sm'
                      className='rounded-md h-8'
                      onClick={() => setChartRange(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className='h-64 rounded-lg bg-muted/50 flex items-end justify-around gap-1 px-2 pb-2'>
                  {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                    <div
                      key={i}
                      className='flex-1 min-w-[8px] rounded-t bg-primary/70 transition-all'
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {isSuccessModalOpen && (
        <OrderStatus
          title={lpDetails?.actionType + ' Order'}
          onClose={() => setIsSuccessModalOpen(false)}
          swapResult={txResult}
          lpDetails={lpDetails}
          orderStatus={
            txResult?.noteId ? orderStatus[txResult.noteId]?.status : undefined
          }
        />
      )}
    </div>
  );
}

