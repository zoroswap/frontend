import AssetIcon from '@/components/AssetIcon';
import { IlRiskCard } from '@/components/IlRiskCard';
import { fullNumberBigintFormat, prettyBigintFormat } from '@/lib/format';
import { PoolCompositionCard } from '@/components/PoolCompositionCard';
import { PoolDetailHeader } from '@/components/PoolDetailHeader';
import { PoolDetailLayout } from '@/components/PoolDetailLayout';
import { PoolDetailStats } from '@/components/PoolDetailStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PoolInfoCard } from '@/components/PoolInfoCard';
import { RecentTransactionsCard } from '@/components/RecentTransactionsCard';
import { XykPoolModal } from '@/components/XykPoolModal';
import { useXykLpBalance } from '@/hooks/useXykLpBalance';
import { useXykPool } from '@/hooks/useXykPool';
import { useXykPoolNotes } from '@/hooks/useXykPoolNotes';
import { getMockRecentTransactions } from '@/mocks/poolDetailMocks';
import { ModalContext } from '@/providers/ModalContext';
import { useCallback, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';

const feeTierForSymbol = (_symbol: string) => '0.30%';

export default function XykPoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const decodedPoolId = poolId ? decodeURIComponent(poolId) : undefined;
  const modalContext = useContext(ModalContext);
  const { data: poolData, isLoading: poolLoading, error: poolError } = useXykPool(
    decodedPoolId,
  );
  const { lpBalance, refetch: refetchLpBalance } = useXykLpBalance(decodedPoolId);
  const { notes: poolNotes, isLoading: notesLoading, error: notesError } = useXykPoolNotes(
    decodedPoolId,
    poolData ?? null,
  );
  const hasPosition = lpBalance > BigInt(0);

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

  const mockRecentTxs = useMemo(() => {
    if (!poolData) return [];
    return getMockRecentTransactions({
      seedKey: decodedPoolId ?? '',
      baseSymbol: poolData.token0.symbol,
    });
  }, [decodedPoolId, poolData]);

  if (poolLoading && !poolData) {
    return (
      <PoolDetailLayout backTo='/pools' backLabel='Back to pools' title='Pool'>
        <p className='text-muted-foreground'>Loading pool…</p>
      </PoolDetailLayout>
    );
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
  const feeTier = feeTierForSymbol(poolData.token0.symbol);
  const priceDisplay =
    poolData.priceToken0InToken1 > 0
      ? `1 ${poolData.token0.symbol} = ${poolData.priceToken0InToken1.toFixed(6)} ${poolData.token1.symbol}`
      : '—';
  const totalSupplyFormatted = fullNumberBigintFormat({
    value: poolData.totalSupply,
    expo: 18,
  });

  const assetSymbol = (faucetIdBech32: string) => {
    if (faucetIdBech32 === poolData.token0.faucetIdBech32) return poolData.token0.symbol;
    if (faucetIdBech32 === poolData.token1.faucetIdBech32) return poolData.token1.symbol;
    return null;
  };
  const assetDecimals = (faucetIdBech32: string) => {
    if (faucetIdBech32 === poolData.token0.faucetIdBech32) return poolData.token0.decimals;
    if (faucetIdBech32 === poolData.token1.faucetIdBech32) return poolData.token1.decimals;
    return 18;
  };

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
              <CardTitle className='text-base font-semibold'>Pool notes</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {notesLoading ? (
                <p className='py-4 px-4 text-muted-foreground text-sm'>Loading notes…</p>
              ) : notesError ? (
                <p className='py-4 px-4 text-destructive text-sm'>{notesError.message}</p>
              ) : poolNotes.length === 0 ? (
                <p className='py-4 px-4 text-muted-foreground text-sm'>No notes issued by this pool yet.</p>
              ) : (
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
                          <td className='py-3 px-4 font-mono text-muted-foreground truncate max-w-[140px]' title={row.noteId}>
                            {row.noteId.slice(0, 10)}…{row.noteId.slice(-6)}
                          </td>
                          <td className='py-3 px-4'>
                            <span className='inline-flex flex-wrap items-center gap-x-3 gap-y-1'>
                              {row.assets.map((a) => {
                                const sym = assetSymbol(a.faucetIdBech32);
                                return (
                                  <span key={a.faucetIdBech32} className='inline-flex items-center gap-1.5'>
                                    <AssetIcon symbol={sym ?? '?'} size={18} />
                                    {prettyBigintFormat({ value: a.amount, expo: assetDecimals(a.faucetIdBech32) })}
                                    {sym ? ` ${sym}` : ''}
                                  </span>
                                );
                              })}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-right text-muted-foreground'>
                            {row.impliedPrice != null
                              ? `1 ${poolData.token0.symbol} = ${row.impliedPrice.toFixed(6)} ${poolData.token1.symbol}`
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
          <RecentTransactionsCard transactions={mockRecentTxs} />
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
