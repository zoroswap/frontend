import AssetIcon from '@/components/AssetIcon';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { type LpDetails, OrderStatus, type TxResult } from '@/components/OrderStatus';
import PoolModal from '@/components/PoolModal';
import type { LpActionType } from '@/components/PoolModal';
import { TradingViewCandlesChart } from '@/components/TradingViewCandlesChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { fullNumberBigintFormat, prettyBigintFormat, truncateId } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getMockPoolCandles, getMockRecentTransactions } from '@/mocks/poolDetailMocks';
import { ModalContext } from '@/providers/ModalContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

/** Saturation = (reserve / total_liabilities) as percentage (can exceed 100). hfAMM only. */
function getSaturationPercent(
  poolBalance: { reserve: bigint; totalLiabilities: bigint },
): number | null {
  const { reserve, totalLiabilities } = poolBalance;
  if (totalLiabilities === BigInt(0)) return null;
  return (Number(reserve) / Number(totalLiabilities)) * 100;
}

function getSaturationColorClass(pct: number): string {
  if (pct < 15 || pct > 185) return 'text-red-600 border-red-600/30 bg-red-500/10';
  if ((pct >= 15 && pct < 30) || (pct >= 170 && pct <= 185)) {
    return 'text-yellow-600 border-yellow-600/30 bg-yellow-500/10';
  }
  if (pct >= 30 && pct < 170) return 'text-green-600 border-green-600/30 bg-green-500/10';
  return 'text-muted-foreground border-border bg-muted/30';
}

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

  const mockCandles = useMemo(() => {
    if (!pool) return [];
    return getMockPoolCandles({
      seedKey: pool.faucetIdBech32,
      range: chartRange,
    });
  }, [pool?.faucetIdBech32, chartRange]);

  const mockRecentTxs = useMemo(() => {
    if (!pool) return [];
    return getMockRecentTransactions({
      seedKey: pool.faucetIdBech32,
      baseSymbol: pool.symbol,
    });
  }, [pool?.faucetIdBech32, pool?.symbol]);

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
  const tvlFormatted = fullNumberBigintFormat({
    value: poolBalance.totalLiabilities,
    expo: decimals,
  });
  const isHfAmm = pool.poolType === 'hfAMM';
  const saturationPercent = isHfAmm ? getSaturationPercent(poolBalance) : null;
  const saturationColor = saturationPercent != null
    ? getSaturationColorClass(saturationPercent)
    : '';
  const pairLabel = isHfAmm ? `${pool.symbol}` : `${pool.symbol} / USDC`;

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
            {isHfAmm
              ? (
                <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                  <AssetIcon symbol={pool.symbol} size={40} />
                </span>
              )
              : (
                <div className='flex -space-x-2'>
                  <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                    <AssetIcon symbol={pool.symbol} size={40} />
                  </span>
                  <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
                    <AssetIcon symbol='USDC' size={40} />
                  </span>
                </div>
              )}
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
          {isHfAmm && saturationPercent != null && (
            <Card className='rounded-xl'>
              <CardContent className='p-4'>
                <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                  Saturation
                </p>
                <p className='text-lg font-semibold'>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md border text-sm font-medium',
                      saturationColor,
                    )}
                    title='reserve / total liabilities'
                  >
                    {saturationPercent.toFixed(2)}%
                  </span>
                </p>
              </CardContent>
            </Card>
          )}
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                APR (est.)
              </p>
              <p className='text-lg font-semibold text-muted-foreground'>—</p>
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                24H Volume
              </p>
              <p className='text-lg font-semibold text-muted-foreground'>—</p>
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
                24H Fees
              </p>
              <p className='text-lg font-semibold text-muted-foreground'>—</p>
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-1 space-y-6'>
            <Card className='rounded-xl'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>
                  Pool Composition
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {isHfAmm
                  ? (
                    <>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <AssetIcon symbol={pool.symbol} size={24} />
                          <span>{pool.symbol}</span>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>—</p>
                          <p className='text-xs text-muted-foreground'>Single-sided</p>
                        </div>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        hfAMM pools are single-sided.
                      </p>
                    </>
                  )
                  : (
                    <>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <AssetIcon symbol={pool.symbol} size={24} />
                          <span>{pool.symbol}</span>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>
                            {prettyBigintFormat({
                              value: poolBalance.reserve,
                              expo: decimals,
                            })}
                          </p>
                          <p className='text-xs text-muted-foreground'>—</p>
                        </div>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <AssetIcon symbol='USDC' size={24} />
                          <span>USDC</span>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>
                            {prettyBigintFormat({
                              value: poolBalance.totalLiabilities,
                              expo: decimals,
                            })}
                          </p>
                          <p className='text-xs text-muted-foreground'>—</p>
                        </div>
                      </div>
                      {(() => {
                        const total = poolBalance.reserve + poolBalance.totalLiabilities;
                        const reservePct = total > 0n
                          ? Number((poolBalance.reserve * 100n) / total)
                          : 50;
                        const liabPct = total > 0n
                          ? Number((poolBalance.totalLiabilities * 100n) / total)
                          : 50;
                        return (
                          <>
                            <div className='h-2 rounded-full bg-muted overflow-hidden flex'>
                              <div
                                className='h-full bg-primary/80 rounded-l-full'
                                style={{ width: `${reservePct}%` }}
                              />
                              <div
                                className='h-full bg-blue-400/80'
                                style={{ width: `${liabPct}%` }}
                              />
                            </div>
                            <p className='text-xs text-muted-foreground'>
                              {total > 0n
                                ? `${pool.symbol} ${reservePct}% · USDC ${liabPct}%`
                                : '—'}
                            </p>
                          </>
                        );
                      })()}
                    </>
                  )}
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
                  <span className='text-muted-foreground'>—</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>24h Transactions</span>
                  <span className='text-muted-foreground'>—</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Liquidity</span>
                  <span>${tvlFormatted}</span>
                </div>
                {isHfAmm && (
                  <>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Total Liabilities</span>
                      <span>
                        {fullNumberBigintFormat({
                          value: poolBalance.totalLiabilities,
                          expo: decimals,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Reserve</span>
                      <span>
                        {fullNumberBigintFormat({
                          value: poolBalance.reserve,
                          expo: decimals,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {!isHfAmm && (
              <Card className='rounded-xl border-amber-500/30 bg-amber-500/5'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base font-semibold flex items-center gap-2'>
                    <AlertTriangle className='h-4 w-4 text-amber-600' />
                    IL Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    This pool&apos;s tokens may have price correlation. Impermanent loss
                    is possible when prices move. Consider concentrated ranges carefully.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className='lg:col-span-2 space-y-6'>
            {!isHfAmm && (
              <Card className='rounded-xl'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base font-semibold'>
                    Recent Transactions
                  </CardTitle>
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
                        {mockRecentTxs.map((tx, i) => (
                          <tr key={i} className='border-b border-border/50'>
                            <td
                              className={`py-3 px-4 font-medium ${
                                TYPE_COLORS[tx.type] ?? ''
                              }`}
                            >
                              {tx.type}
                            </td>
                            <td className='py-3 px-4'>{tx.amountIn}</td>
                            <td className='py-3 px-4'>{tx.amountOut}</td>
                            <td className='py-3 px-4 font-mono text-muted-foreground'>
                              {tx.account}
                            </td>
                            <td className='py-3 px-4 text-right text-muted-foreground'>
                              {tx.timeAgo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <div className='rounded-lg overflow-hidden border border-border/60'>
                  <TradingViewCandlesChart
                    candles={mockCandles}
                    height={256}
                  />
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
          orderStatus={txResult?.noteId
            ? orderStatus[txResult.noteId]?.status
            : undefined}
        />
      )}
    </div>
  );
}
