import { AllDropdown } from '@/components/AllDropdown';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import LiquidityPoolsTable from '@/components/LiquidityPoolsTable';
import { poweredByMiden } from '@/components/PoweredByMiden';
import XykPoolTable from '@/components/XykTable/XykPoolTable';
import { type LpDetails, OrderStatus, type TxResult } from '@/components/OrderStatus';
import PoolModal from '@/components/PoolModal';
import type { LpActionType } from '@/components/PoolModal';
import { PositionCard } from '@/components/PositionCard';
import { SelectPoolModal } from '@/components/SelectPoolModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { ModalContext } from '@/providers/ModalContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { Search } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Explore() {
  const navigate = useNavigate();
  const { data: poolsInfo, refetch: refetchPoolsInfo, isLoading: isLoadingPools } =
    usePoolsInfo();
  const {
    data: poolBalances,
    refetch: refetchPoolBalances,
    isLoading: isLoadingBalances,
  } = usePoolsBalances();
  const modalContext = useContext(ModalContext);
  const { tokens } = useContext(ZoroContext);
  const { orderStatus, registerCallback } = useOrderUpdates();
  const lastShownNoteId = useRef<string | undefined>(undefined);
  const [txResult, setTxResult] = useState<undefined | TxResult>();
  const [lpDetails, setLpDetails] = useState<undefined | LpDetails>(undefined);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [communityPoolsSearch, setCommunityPoolsSearch] = useState('');

  const tokenConfigs = useMemo(
    () => poolsInfo?.liquidityPools?.map(p => tokens[p.faucetIdBech32]),
    [tokens, poolsInfo?.liquidityPools],
  );

  const { balances: lpBalances, refetch: refetchLpBalances } = useLPBalances({
    tokens: tokenConfigs,
  });

  const openOrderStatusModal = useCallback((noteId: string) => {
    lastShownNoteId.current = noteId;
    setIsSuccessModalOpen(true);
  }, []);

  useEffect(() => {
    if (txResult?.noteId) {
      registerCallback(txResult.noteId, status => {
        if (status === 'executed') {
          refetchLpBalances();
          refetchPoolBalances();
        }
      });
    }
  }, [
    txResult?.noteId,
    refetchPoolBalances,
    refetchLpBalances,
    registerCallback,
  ]);

  const openPoolModal = useCallback(
    (pool: PoolInfo, initialMode?: LpActionType) => {
      modalContext.openModal(
        <PoolModal
          pool={pool}
          refetchPoolInfo={refetchPoolsInfo}
          setTxResult={setTxResult}
          setLpDetails={setLpDetails}
          onSuccess={openOrderStatusModal}
          lpBalance={lpBalances[pool.faucetIdBech32] ?? BigInt(0)}
          initialMode={initialMode}
        />,
      );
    },
    [modalContext, refetchPoolsInfo, openOrderStatusModal, lpBalances],
  );

  const onPoolRowClick = useCallback(
    (pool: PoolInfo) => {
      navigate(`/pools/hf/${encodeURIComponent(pool.faucetIdBech32)}`);
    },
    [navigate],
  );

  const openNewPositionModal = useCallback(() => {
    const pools = poolsInfo?.liquidityPools ?? [];
    modalContext.openModal(
      <SelectPoolModal
        pools={pools}
        onSelect={(pool) => {
          setTimeout(() => openPoolModal(pool, 'Deposit'), 0);
        }}
        onClose={() => modalContext.closeModal()}
      />,
    );
  }, [modalContext, poolsInfo?.liquidityPools, openPoolModal]);

  const userPositions = useMemo(() => {
    const liquidityPools = poolsInfo?.liquidityPools;
    if (!liquidityPools || !poolBalances) return [];
    return liquidityPools
      .filter((pool) => pool.poolType === 'hfAMM')
      .map((pool) => {
        const balance = poolBalances.find((b) =>
          b.faucetIdBech32 === pool.faucetIdBech32
        );
        const lp = lpBalances[pool.faucetIdBech32] ?? BigInt(0);
        if (!balance || lp <= BigInt(0)) return null;
        return { pool, poolBalance: balance, lpBalance: lp };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [poolsInfo?.liquidityPools, poolBalances, lpBalances]);

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Explore - ZoroSwap | DeFi on Miden</title>
      <meta
        name='description'
        content='Deposit to ZoroSwap pools to earn attractive yield'
      />
      <Header />
      <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
        <section className='mb-12'>
          <div className='flex flex-wrap items-center justify-between gap-4 mb-4'>
            <h2 className='text-2xl font-bold font-cal-sans text-foreground'>
              Your positions
            </h2>
            <div className='flex items-center gap-3'>
              <AllDropdown />
              <AllDropdown />
              <Button
                size='sm'
                className='rounded-lg bg-primary text-primary-foreground'
                onClick={openNewPositionModal}
              >
                New Position
              </Button>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {userPositions.length > 0
              ? userPositions.map(({ pool, poolBalance, lpBalance }) => (
                <PositionCard
                  key={pool.faucetIdBech32}
                  pool={pool}
                  poolBalance={poolBalance}
                  lpBalance={lpBalance}
                  variant='slim'
                  onDeposit={() => openPoolModal(pool, 'Deposit')}
                  onWithdraw={() => openPoolModal(pool, 'Withdraw')}
                />
              ))
              : (
                <div className='col-span-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-muted-foreground text-sm'>
                  No positions yet. Add liquidity in High frequency pools below.
                </div>
              )}
          </div>
        </section>

        <section id='high-frequency-pools'>
          <h2 className='text-2xl font-bold font-cal-sans text-foreground mb-4'>
            High frequency pools
          </h2>
          <LiquidityPoolsTable
            poolsInfo={poolsInfo}
            poolBalances={poolBalances}
            lpBalances={lpBalances}
            tokenConfigs={tokenConfigs}
            openPoolModal={openPoolModal}
            onPoolRowClick={onPoolRowClick}
            isLoading={isLoadingPools || isLoadingBalances}
          />
          <div className='flex justify-center mt-6'>
            {poweredByMiden}
          </div>
          <div className='flex flex-wrap items-center justify-between gap-4 mt-12 mb-4'>
            <h2 className='text-2xl font-bold font-cal-sans text-foreground'>
              Community pools
            </h2>
            <Button
              size='sm'
              className='rounded-lg bg-primary text-primary-foreground'
              asChild
            >
              <Link to='/new-xyk-pool'>Create pool</Link>
            </Button>
          </div>
          <div className='relative mb-4'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by pool id (bech32 or 0x hex)…'
              value={communityPoolsSearch}
              onChange={e => setCommunityPoolsSearch(e.target.value)}
              className='pl-9 rounded-lg bg-muted/50 border-muted-foreground/20'
            />
          </div>
          <XykPoolTable search={communityPoolsSearch} />
        </section>
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

export default Explore;
