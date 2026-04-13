import AssetIcon from '@/components/AssetIcon';
import { type LpDetails, OrderStatus, type TxResult } from '@/components/OrderStatus';
import { PoolCompositionCard } from '@/components/PoolCompositionCard';
import { PoolDetailHeader } from '@/components/PoolDetailHeader';
import { PoolDetailLayout } from '@/components/PoolDetailLayout';
import { PoolDetailStats } from '@/components/PoolDetailStats';
import { PoolInfoCard } from '@/components/PoolInfoCard';
import PoolModal from '@/components/PoolModal';
import type { LpActionType } from '@/components/PoolModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { formatTokenAmount, fullNumberBigintFormat } from '@/lib/format';
import { ModalContext } from '@/providers/ModalContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

function getSaturationPercent(
  poolBalance: { reserve: bigint; totalLiabilities: bigint },
): number | null {
  const { reserve, totalLiabilities } = poolBalance;
  if (totalLiabilities === BigInt(0)) return null;
  return (Number(reserve) / Number(totalLiabilities)) * 100;
}

export default function HfPoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const decodedPoolId = poolId ? decodeURIComponent(poolId) : undefined;
  const { data: poolsInfo, refetch: refetchPoolsInfo } = usePoolsInfo();
  const { data: poolBalances } = usePoolsBalances();
  const modalContext = useContext(ModalContext);
  const { tokens } = useContext(ZoroContext);
  const { orderStatus, registerCallback } = useOrderUpdates();
  const lastShownNoteId = useRef<string | undefined>(undefined);
  const [txResult, setTxResult] = useState<undefined | TxResult>();
  const [lpDetails, setLpDetails] = useState<undefined | LpDetails>(undefined);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const tokenConfigs = useMemo(
    () => poolsInfo?.liquidityPools?.map((p) => tokens[p.faucetIdBech32]),
    [tokens, poolsInfo?.liquidityPools],
  );
  const { balances: lpBalances, refetch: refetchLpBalances } = useLPBalances({
    tokens: tokenConfigs,
  });

  const pool = useMemo(() => {
    if (!decodedPoolId || !poolsInfo?.liquidityPools) return null;
    return (
      poolsInfo.liquidityPools.find((p) => p.faucetIdBech32 === decodedPoolId)
        ?? null
    );
  }, [decodedPoolId, poolsInfo?.liquidityPools]);

  const poolBalance = useMemo(() => {
    if (!pool || !poolBalances) return null;
    return poolBalances.find((b) => b.faucetIdBech32 === pool.faucetIdBech32) ?? null;
  }, [pool, poolBalances]);

  const lpBalance = pool ? lpBalances[pool.faucetIdBech32] ?? BigInt(0) : BigInt(0);
  const hasPosition = lpBalance > BigInt(0);

  const poolSharePct = useMemo(() => {
    if (!pool || !poolBalance || !hasPosition || poolBalance.totalLiabilities === 0n) {
      return null;
    }
    return (Number(lpBalance) / Number(poolBalance.totalLiabilities)) * 100;
  }, [pool, poolBalance, lpBalance, hasPosition]);

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
      <PoolDetailLayout backTo='/explore' title='Pool'>
        <p className='text-muted-foreground'>Pool not found.</p>
        <Link to='/explore' className='text-primary hover:underline mt-2 inline-block'>
          ← Back to pools
        </Link>
      </PoolDetailLayout>
    );
  }

  const decimals = pool.decimals;
  const feeTier = feeTierForSymbol(pool.symbol);
  const tvlFormatted = fullNumberBigintFormat({
    value: poolBalance.totalLiabilities,
    expo: decimals,
  });
  const saturationPercent = getSaturationPercent(poolBalance);
  const pairLabel = pool.symbol;

  return (
    <PoolDetailLayout
      backTo='/explore'
      backLabel='Back to pools'
      title={pairLabel}
    >
      <PoolDetailHeader
        pairLabel={pairLabel}
        feeTier={feeTier}
        poolIdBech32={pool.faucetIdBech32}
        onAddLiquidity={() => openPoolModal(pool, 'Deposit')}
        onWithdraw={() => openPoolModal(pool, 'Withdraw')}
        hasPosition={hasPosition}
        headerIcons={
          <span className='inline-block rounded-full border-2 border-background overflow-hidden bg-muted'>
            <AssetIcon symbol={pool.symbol} size={40} />
          </span>
        }
      />

      <PoolDetailStats
        tvlFormatted={tvlFormatted}
        saturationPercent={saturationPercent}
      />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-1 space-y-6'>
          {hasPosition && pool && (
            <Card className='rounded-xl'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>Your Position</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>LP Balance</span>
                  <span className='font-medium tabular-nums'>
                    {formatTokenAmount({ value: lpBalance, expo: decimals })}
                  </span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Pool Share</span>
                  <span className='font-medium tabular-nums'>
                    {poolSharePct != null
                      ? poolSharePct < 0.01
                        ? `${poolSharePct.toFixed(6)}%`
                        : `${poolSharePct.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
                <div className='border-t border-border pt-3 space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='inline-flex items-center gap-1.5'>
                      <AssetIcon symbol={pool.symbol} size={20} />
                      <span className='text-muted-foreground'>{pool.symbol}</span>
                    </span>
                    <span className='font-medium tabular-nums'>
                      {formatTokenAmount({ value: lpBalance, expo: decimals })}
                    </span>
                  </div>
                </div>
                <div className='flex gap-2 pt-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                    onClick={() => openPoolModal(pool, 'Deposit')}
                  >
                    Deposit
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                    onClick={() => openPoolModal(pool, 'Withdraw')}
                  >
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <PoolCompositionCard variant='hf' symbol={pool.symbol} />
          <PoolInfoCard
            tvlFormatted={tvlFormatted}
            extraRows={[
              {
                label: 'Total Liabilities',
                value: fullNumberBigintFormat({
                  value: poolBalance.totalLiabilities,
                  expo: decimals,
                }),
              },
              {
                label: 'Reserve',
                value: fullNumberBigintFormat({
                  value: poolBalance.reserve,
                  expo: decimals,
                }),
              },
            ]}
          />
        </div>

        <div className='lg:col-span-2'>
          <Card className='rounded-xl h-full flex items-center justify-center min-h-[320px]'>
            <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
              <p className='text-lg font-medium text-foreground'>Chart coming soon!</p>
              <p className='text-sm text-muted-foreground max-w-xs'>
                We're working on bringing you detailed pool analytics. Stay tuned!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </PoolDetailLayout>
  );
}
