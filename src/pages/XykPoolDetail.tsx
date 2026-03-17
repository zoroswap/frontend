import AssetIcon from '@/components/AssetIcon';
import { IlRiskCard } from '@/components/IlRiskCard';
import { PoolCompositionCard } from '@/components/PoolCompositionCard';
import { PoolDetailHeader } from '@/components/PoolDetailHeader';
import { PoolDetailLayout } from '@/components/PoolDetailLayout';
import { PoolDetailStats } from '@/components/PoolDetailStats';
import { PoolInfoCard } from '@/components/PoolInfoCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { XykPoolModal } from '@/components/XykPoolModal';
import { useBalance } from '@/hooks/useBalance';
import { useXykLpBalance } from '@/hooks/useXykLpBalance';
import { useXykPool } from '@/hooks/useXykPool';
import type { XykTokenInfo } from '@/hooks/useXykPool';
import { useXykPoolNotes } from '@/hooks/useXykPoolNotes';
import { useWaitForNoteConsumed } from '@/hooks/useWaitForNoteConsumed';
import { useXykSwap } from '@/hooks/useXykSwap';
import { getMidenscanNoteUrl, getMidenscanTxUrl } from '@/hooks/useLaunchpad';
import {
  formatTokenAmountForInput,
  fullNumberBigintFormat,
  prettyBigintFormat,
} from '@/lib/format';
import { getAmountOut } from '@/lib/xykMath';
import { getMockRecentTransactions } from '@/mocks/poolDetailMocks';
import { ModalContext } from '@/providers/ModalContext';
import { XykPoolDetailSkeleton } from '@/pages/skeletons/XykPoolDetailSkeleton';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { ArrowDownUp, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { parseUnits } from 'viem';

const feeTierForSymbol = () => '0.30%';

const SWAP_PROGRESS_STEPS = [
  'Creating note',
  'Sending note',
  'Waiting for trade to be confirmed on network',
] as const;

export default function XykPoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const decodedPoolId = poolId ? decodeURIComponent(poolId) : undefined;
  const modalContext = useContext(ModalContext);
  const { data: poolData, isLoading: poolLoading, error: poolError } = useXykPool(
    decodedPoolId,
  );
  const { lpBalance, refetch: refetchLpBalance } = useXykLpBalance(decodedPoolId);
  useXykPoolNotes(
    decodedPoolId,
    poolData ?? null,
  );
  const { swap, isLoading: isSwapLoading, error: swapError, noteId: swapNoteId, txId: swapTxId } = useXykSwap(decodedPoolId);
  const waitForNoteConsumed = useWaitForNoteConsumed({ timeoutMs: 60_000 });
  const [swapSellSide, setSwapSellSide] = useState<0 | 1>(0);
  const [amountInStr, setAmountInStr] = useState('');
  const [swapInputError, setSwapInputError] = useState<string | undefined>();
  const [swapProgressStep, setSwapProgressStep] = useState<number | null>(null);
  const [lastTrade, setLastTrade] = useState<{
    noteId: string;
    txId: string | undefined;
    amountIn: bigint;
    amountOut: bigint;
    sellSymbol: string;
    buySymbol: string;
    sellDecimals: number;
    buyDecimals: number;
  } | null>(null);
  const hasPosition = lpBalance > BigInt(0);

  useEffect(() => {
    if (!isSwapLoading) setSwapProgressStep(null);
  }, [isSwapLoading]);

  const xykTokenToConfig = useCallback((t: XykTokenInfo): TokenConfig => ({
    symbol: t.symbol,
    name: t.name ?? t.symbol,
    decimals: t.decimals,
    faucetId: t.faucetId,
    faucetIdBech32: t.faucetIdBech32,
    oracleId: '',
  }), []);

  const swapToken0Config = useMemo<TokenConfig | undefined>(
    () => (poolData ? xykTokenToConfig(poolData.token0) : undefined),
    [poolData, xykTokenToConfig],
  );
  const swapToken1Config = useMemo<TokenConfig | undefined>(
    () => (poolData ? xykTokenToConfig(poolData.token1) : undefined),
    [poolData, xykTokenToConfig],
  );
  const { balance: balanceToken0 } = useBalance({ token: swapToken0Config });
  const { balance: balanceToken1 } = useBalance({ token: swapToken1Config });

  const swapSellToken = useMemo(
    () => (poolData ? (swapSellSide === 0 ? poolData.token0 : poolData.token1) : null),
    [poolData, swapSellSide],
  );
  const swapBuyToken = useMemo(
    () => (poolData ? (swapSellSide === 0 ? poolData.token1 : poolData.token0) : null),
    [poolData, swapSellSide],
  );

  const sellBalance = swapSellSide === 0 ? balanceToken0 : balanceToken1;
  const buyBalance = swapSellSide === 0 ? balanceToken1 : balanceToken0;

  const amountInBigint = useMemo(() => {
    if (!swapSellToken || !amountInStr.trim()) return 0n;
    try {
      return parseUnits(amountInStr.trim(), swapSellToken.decimals);
    } catch {
      return 0n;
    }
  }, [amountInStr, swapSellToken]);

  const expectedAmountOut = useMemo(() => {
    if (!poolData || !swapSellToken || !swapBuyToken || amountInBigint <= 0n) return 0n;
    const [reserveIn, reserveOut] = swapSellSide === 0
      ? [poolData.reserve0, poolData.reserve1]
      : [poolData.reserve1, poolData.reserve0];
    return getAmountOut(amountInBigint, reserveIn, reserveOut);
  }, [poolData, swapSellSide, swapSellToken, swapBuyToken, amountInBigint]);

  const expectedAmountOutStr = useMemo(
    () =>
      swapBuyToken && expectedAmountOut >= 0n
        ? formatTokenAmountForInput({
          value: expectedAmountOut,
          expo: swapBuyToken.decimals,
        })
        : '',
    [swapBuyToken, expectedAmountOut],
  );

  const onSwapDirection = useCallback(() => {
    setSwapSellSide((s) => (s === 0 ? 1 : 0));
    setAmountInStr('');
    setSwapInputError(undefined);
  }, []);

  const SWAP_PERCENTAGES = [25, 50, 75, 100] as const;
  const setSellAmountPct = useCallback(
    (pct: number) => {
      if (!swapSellToken || sellBalance == null || sellBalance <= 0n) return;
      const amount = (sellBalance * BigInt(pct)) / 100n;
      setAmountInStr(
        formatTokenAmountForInput({
          value: amount,
          expo: swapSellToken.decimals,
        }),
      );
      setSwapInputError(undefined);
    },
    [swapSellToken, sellBalance],
  );

  const onExecuteSwap = useCallback(async () => {
    if (!poolData || !swapSellToken || !swapBuyToken) return;
    setSwapInputError(undefined);
    if (amountInBigint <= 0n) {
      setSwapInputError('Enter amount to sell');
      return;
    }
    setSwapProgressStep(null);
    const result = await swap(
      swapSellToken.faucetId,
      swapBuyToken.faucetId,
      amountInBigint,
      expectedAmountOut,
      {
        onProgress: (step) => setSwapProgressStep(step),
        waitForNoteConsumed,
      },
    );
    if (result) {
      setAmountInStr('');
      setLastTrade({
        noteId: result.noteId,
        txId: result.txId,
        amountIn: amountInBigint,
        amountOut: expectedAmountOut,
        sellSymbol: swapSellToken.symbol,
        buySymbol: swapBuyToken.symbol,
        sellDecimals: swapSellToken.decimals,
        buyDecimals: swapBuyToken.decimals,
      });
    }
  }, [poolData, swapSellToken, swapBuyToken, amountInBigint, expectedAmountOut, swap, waitForNoteConsumed]);

  const openXykModal = useCallback(
    (mode: 'Deposit' | 'Withdraw') => {
      if (!decodedPoolId) return;
      modalContext.openModal(
        <XykPoolModal
          poolId={decodedPoolId}
          initialMode={mode}
          onSuccess={() => refetchLpBalance()}
        />,
      );
    },
    [decodedPoolId, modalContext, refetchLpBalance],
  );

  const _mockRecentTxs = useMemo(() => {
    if (!poolData) return [];
    return getMockRecentTransactions({
      seedKey: decodedPoolId ?? '',
      baseSymbol: poolData.token0.symbol,
    });
  }, [decodedPoolId, poolData]);
  void _mockRecentTxs;

  if (poolLoading && !poolData) {
    return <XykPoolDetailSkeleton />;
  }

  if (poolError || !poolData) {
    return (
      <PoolDetailLayout backTo='/pools' title='Pool'>
        <p className='text-muted-foreground'>
          {poolError ? poolError.message : 'Pool not found.'}
        </p>
      </PoolDetailLayout>
    );
  }

  const pairLabel = `${poolData.token0.symbol} / ${poolData.token1.symbol}`;
  const feeTier = feeTierForSymbol();
  const priceDisplay = poolData.priceToken0InToken1 > 0
    ? `1 ${poolData.token0.symbol} = ${
      poolData.priceToken0InToken1.toFixed(6)
    } ${poolData.token1.symbol}`
    : '—';
  const totalSupplyFormatted = fullNumberBigintFormat({
    value: poolData.totalSupply,
    expo: 0,
  });

  const _assetSymbol = (faucetIdBech32: string) => {
    if (faucetIdBech32 === poolData.token0.faucetIdBech32) return poolData.token0.symbol;
    if (faucetIdBech32 === poolData.token1.faucetIdBech32) return poolData.token1.symbol;
    return null;
  };
  const _assetDecimals = (faucetIdBech32: string) => {
    if (faucetIdBech32 === poolData.token0.faucetIdBech32) {
      return poolData.token0.decimals;
    }
    if (faucetIdBech32 === poolData.token1.faucetIdBech32) {
      return poolData.token1.decimals;
    }
    return 18;
  };
  void _assetSymbol;
  void _assetDecimals;

  return (
    <PoolDetailLayout
      backTo='/pools'
      backLabel='Back to pools'
      title={pairLabel}
    >
      <PoolDetailHeader
        pairLabel={pairLabel}
        feeTier={feeTier}
        poolIdBech32={decodedPoolId!}
        onAddLiquidity={() => openXykModal('Deposit')}
        onWithdraw={() => openXykModal('Withdraw')}
        hasPosition={hasPosition}
        headerIcons={
          <div className='flex -space-x-2'>
            <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
              <AssetIcon symbol={poolData.token0.symbol} size={40} />
            </span>
            <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
              <AssetIcon symbol={poolData.token1.symbol} size={40} />
            </span>
          </div>
        }
      />
      <PoolDetailStats
        priceLabel='Price'
        priceValue={priceDisplay}
        mainLabel='Total LP Supply'
        tvlFormatted={totalSupplyFormatted}
      />
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-1 space-y-6'>
          <PoolCompositionCard
            variant='xyk'
            token0Symbol={poolData.token0.symbol}
            token1Symbol={poolData.token1.symbol}
            reserve0={poolData.reserve0}
            reserve1={poolData.reserve1}
            decimals0={poolData.token0.decimals}
            decimals1={poolData.token1.decimals}
          />
          <PoolInfoCard
            tvlFormatted={totalSupplyFormatted}
            firstRowLabel='Total LP Supply'
            firstRowIsUsd={false}
            extraRows={[
              {
                label: `${poolData.token0.symbol} Reserve`,
                value: (
                  <span className='inline-flex items-center gap-1.5'>
                    <AssetIcon symbol={poolData.token0.symbol} size={20} />
                    {prettyBigintFormat({
                      value: poolData.reserve0,
                      expo: poolData.token0.decimals,
                    })}
                  </span>
                ),
              },
              {
                label: `${poolData.token1.symbol} Reserve`,
                value: (
                  <span className='inline-flex items-center gap-1.5'>
                    <AssetIcon symbol={poolData.token1.symbol} size={20} />
                    {prettyBigintFormat({
                      value: poolData.reserve1,
                      expo: poolData.token1.decimals,
                    })}
                  </span>
                ),
              },
            ]}
          />
          <IlRiskCard />
        </div>

        <div className='lg:col-span-2 space-y-6'>
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base font-semibold'>Swap</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>From</span>
                  {swapSellToken && sellBalance != null && (
                    <span className='text-muted-foreground text-xs'>
                      Balance: {prettyBigintFormat({
                        value: sellBalance,
                        expo: swapSellToken.decimals,
                      })} {swapSellToken.symbol}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2'>
                  <AssetIcon symbol={swapSellToken?.symbol ?? '?'} size={24} />
                  <Input
                    type='text'
                    inputMode='decimal'
                    placeholder='0'
                    value={amountInStr}
                    onChange={(e) => {
                      setAmountInStr(e.target.value);
                      setSwapInputError(undefined);
                    }}
                    className='border-0 bg-transparent shadow-none focus-visible:ring-0'
                  />
                  <span className='text-muted-foreground shrink-0 text-sm'>
                    {swapSellToken?.symbol ?? '—'}
                  </span>
                </div>
                <div className='flex gap-1'>
                  {SWAP_PERCENTAGES.map((pct) => (
                    <Button
                      key={pct}
                      type='button'
                      variant='outline'
                      size='sm'
                      className='flex-1'
                      onClick={() => setSellAmountPct(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>
              <div className='flex justify-center'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={onSwapDirection}
                  aria-label='Switch direction'
                >
                  <ArrowDownUp className='h-4 w-4' />
                </Button>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>To</span>
                  {swapBuyToken && buyBalance != null && (
                    <span className='text-muted-foreground text-xs'>
                      Balance: {prettyBigintFormat({
                        value: buyBalance,
                        expo: swapBuyToken.decimals,
                      })} {swapBuyToken.symbol}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2'>
                  <AssetIcon symbol={swapBuyToken?.symbol ?? '?'} size={24} />
                  <span className='min-w-0 flex-1 text-right font-medium tabular-nums'>
                    {expectedAmountOutStr || '0'}
                  </span>
                  <span className='text-muted-foreground shrink-0 text-sm'>
                    {swapBuyToken?.symbol ?? '—'}
                  </span>
                </div>
              </div>
              {(swapInputError || swapError) && (
                <p className='text-destructive text-sm'>{swapInputError ?? swapError}</p>
              )}
              <Button
                className='w-full'
                onClick={onExecuteSwap}
                disabled={isSwapLoading
                  || !amountInStr
                  || amountInBigint <= 0n
                  || expectedAmountOut < 0n}
              >
                {isSwapLoading
                  ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Swapping…
                    </>
                  )
                  : (
                    'Swap'
                  )}
              </Button>
              {isSwapLoading && swapProgressStep !== null && (
                <ProgressBar
                  steps={SWAP_PROGRESS_STEPS}
                  currentStepIndex={swapProgressStep}
                  title='Progress'
                />
              )}
              {((isSwapLoading && (swapNoteId || swapTxId)) || lastTrade) && (
                <div className='mt-8 rounded-xl border border-border bg-card overflow-hidden'>
                  <div className='px-3 py-2 border-b border-border bg-muted/30'>
                    <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                      {isSwapLoading ? 'Trade in progress' : 'Last trade'}
                    </span>
                  </div>
                  <div className='p-4 space-y-4'>
                    {(() => {
                      const isCurrent = isSwapLoading && (swapNoteId || swapTxId);
                      const noteId = isCurrent ? swapNoteId : lastTrade?.noteId;
                      const txId = isCurrent ? swapTxId : lastTrade?.txId;
                      const amountIn = isCurrent ? amountInBigint : lastTrade!.amountIn;
                      const amountOut = isCurrent ? expectedAmountOut : lastTrade!.amountOut;
                      const sellSym = isCurrent ? swapSellToken?.symbol ?? '—' : lastTrade!.sellSymbol;
                      const buySym = isCurrent ? swapBuyToken?.symbol ?? '—' : lastTrade!.buySymbol;
                      const sellDec = isCurrent ? (swapSellToken?.decimals ?? 18) : lastTrade!.sellDecimals;
                      const buyDec = isCurrent ? (swapBuyToken?.decimals ?? 18) : lastTrade!.buyDecimals;
                      const inStr = prettyBigintFormat({ value: amountIn, expo: sellDec });
                      const outStr = prettyBigintFormat({ value: amountOut, expo: buyDec });
                      return (
                        <>
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center gap-2 min-w-0'>
                              <AssetIcon symbol={sellSym} size={28} />
                              <span className='font-semibold tabular-nums truncate' title={inStr}>
                                {inStr}
                              </span>
                              <span className='text-muted-foreground text-sm shrink-0'>{sellSym}</span>
                            </div>
                            <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground' />
                            <div className='flex items-center gap-2 min-w-0'>
                              <AssetIcon symbol={buySym} size={28} />
                              <span className='font-semibold tabular-nums truncate' title={outStr}>
                                {outStr}
                              </span>
                              <span className='text-muted-foreground text-sm shrink-0'>{buySym}</span>
                            </div>
                          </div>
                          <div className='flex flex-wrap gap-3 pt-2 border-t border-border'>
                            {noteId && (
                              <a
                                href={getMidenscanNoteUrl(noteId)}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-1.5 text-sm text-primary hover:underline'
                              >
                                <span className='font-mono text-muted-foreground'>
                                  Note {noteId.slice(0, 8)}…{noteId.slice(-6)}
                                </span>
                                <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                              </a>
                            )}
                            {txId && (
                              <a
                                href={getMidenscanTxUrl(txId)}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-1.5 text-sm text-primary hover:underline'
                              >
                                <span className='font-mono text-muted-foreground'>
                                  Tx {txId.slice(0, 8)}…{txId.slice(-6)}
                                </span>
                                <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                              </a>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {
            /*
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base font-semibold'>Pool notes</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {notesLoading
                ? (
                  <p className='py-4 px-4 text-muted-foreground text-sm'>
                    Loading notes…
                  </p>
                )
                : notesError
                ? (
                  <p className='py-4 px-4 text-destructive text-sm'>
                    {notesError.message}
                  </p>
                )
                : poolNotes.length === 0
                ? (
                  <p className='py-4 px-4 text-muted-foreground text-sm'>
                    No notes issued by this pool yet.
                  </p>
                )
                : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr className='border-b border-border text-muted-foreground text-xs uppercase tracking-wide'>
                          <th className='text-left py-3 px-4'>Note ID</th>
                          <th className='text-left py-3 px-4'>Assets</th>
                          <th className='text-right py-3 px-4'>Implied price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poolNotes.map((row) => (
                          <tr key={row.noteId} className='border-b border-border/50'>
                            <td
                              className='py-3 px-4 font-mono text-muted-foreground truncate max-w-[140px]'
                              title={row.noteId}
                            >
                              {row.noteId.slice(0, 10)}…{row.noteId.slice(-6)}
                            </td>
                            <td className='py-3 px-4'>
                              <span className='inline-flex flex-wrap items-center gap-x-3 gap-y-1'>
                                {row.assets.map((a) => {
                                  const sym = _assetSymbol(a.faucetIdBech32);
                                  return (
                                    <span
                                      key={a.faucetIdBech32}
                                      className='inline-flex items-center gap-1.5'
                                    >
                                      <AssetIcon symbol={sym ?? '?'} size={18} />
                                      {prettyBigintFormat({
                                        value: a.amount,
                                        expo: _assetDecimals(a.faucetIdBech32),
                                      })}
                                      {sym ? ` ${sym}` : ''}
                                    </span>
                                  );
                                })}
                              </span>
                            </td>
                            <td className='py-3 px-4 text-right text-muted-foreground'>
                              {row.impliedPrice != null
                                ? `1 ${poolData.token0.symbol} = ${
                                  row.impliedPrice.toFixed(6)
                                } ${poolData.token1.symbol}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </CardContent>
          </Card>
          <RecentTransactionsCard transactions={_mockRecentTxs} />
          */
          }
          {
            /*
          <PriceTvlChartCard
            candles={mockCandles}
            chartRange={chartRange}
            onChartRangeChange={setChartRange}
          />
          */
          }
        </div>
      </div>
    </PoolDetailLayout>
  );
}
