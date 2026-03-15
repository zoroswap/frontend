import AssetIcon from '@/components/AssetIcon';
import { type LpDetails, OrderStatus, type TxResult } from '@/components/OrderStatus';
import PoolModal from '@/components/PoolModal';
import type { LpActionType } from '@/components/PoolModal';
import { PoolCompositionCard } from '@/components/PoolCompositionCard';
import { PoolDetailHeader } from '@/components/PoolDetailHeader';
import { PoolDetailLayout } from '@/components/PoolDetailLayout';
import { PoolDetailStats } from '@/components/PoolDetailStats';
import { PoolInfoCard } from '@/components/PoolInfoCard';
import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { fullNumberBigintFormat } from '@/lib/format';
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
      poolsInfo.liquidityPools.find((p) => p.faucetIdBech32 === decodedPoolId) ??
      null
    );
  }, [decodedPoolId, poolsInfo?.liquidityPools]);

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
      <PoolDetailLayout backTo='/pools' title='Pool'>
        <p className='text-muted-foreground'>Pool not found.</p>
        <Link to='/pools' className='text-primary hover:underline mt-2 inline-block'>
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
      backTo='/pools'
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

        {/* Chart commented out for now
        <div className='lg:col-span-2 space-y-6'>
          <PriceTvlChartCard
            candles={mockCandles}
            chartRange={chartRange}
            onChartRangeChange={setChartRange}
          />
        </div>
        */}
      </div>

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
    </PoolDetailLayout>
  );
}
