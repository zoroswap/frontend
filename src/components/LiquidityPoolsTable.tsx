import { useLPBalances } from '@/hooks/useLPBalances';
import { usePoolsBalances } from '@/hooks/usePoolsBalances';
import { type PoolInfo, usePoolsInfo } from '@/hooks/usePoolsInfo';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { ModalContext } from '@/providers/ModalContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import LiquidityPoolRow from './LiquidityPoolRow';
import { type LpDetails, OrderStatus, type TxResult } from './OrderStatus';
import PoolModal from './PoolModal';
import { poweredByMiden } from './PoweredByMiden';
import { useTraceUpdate } from './Price';
import { Card } from './ui/card';

const LiquidityPoolsTable = () => {
  const { data: poolsInfo, refetch: refetchPoolsInfo } = usePoolsInfo();
  const { data: poolBalances, refetch: refetchPoolBalances } = usePoolsBalances();
  const modalContext = useContext(ModalContext);
  const lastShownNoteId = useRef<string | undefined>(undefined);
  const [txResult, setTxResult] = useState<undefined | TxResult>();
  const [lpDetails, setLpDetails] = useState<undefined | LpDetails>(undefined);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const { orderStatus } = useOrderUpdates();
  const { tokens } = useContext(ZoroContext);

  const tokenConfigs = useMemo(
    () => poolsInfo?.liquidityPools?.map(p => tokens[p.faucetIdBech32]),
    [tokens, poolsInfo?.liquidityPools],
  );

  const openOrderStatusModal = useCallback((noteId: string) => {
    lastShownNoteId.current = noteId;
    setIsSuccessModalOpen(true);
  }, []);

  const { balances: lpBalances, refetch: refetchLpBalances } = useLPBalances({
    tokens: tokenConfigs,
  });

  useEffect(() => {
    if (txResult?.noteId && orderStatus[txResult.noteId]?.status === 'executed') {
      refetchLpBalances();
      refetchPoolBalances();
    }
  }, [orderStatus, txResult?.noteId, refetchPoolBalances, refetchLpBalances]);

  const openPoolManagementModal = useCallback(
    (pool: PoolInfo) => {
      modalContext.openModal(
        <PoolModal
          pool={pool}
          refetchPoolInfo={refetchPoolsInfo}
          setTxResult={setTxResult}
          setLpDetails={setLpDetails}
          onSuccess={openOrderStatusModal}
          lpBalance={lpBalances[pool.faucetIdBech32]}
        />,
      );
    },
    [modalContext, refetchPoolsInfo, openOrderStatusModal, lpBalances],
  );

  return (
    <div className='w-full max-w-[920px]'>
      <Card>
        <h1 className='sr-only'>Liquidity Pools</h1>
        <div className='relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-xl'>
          <table className='w-full text-sm text-left rtl:text-right text-body rounded-xl text-xs'>
            <thead>
              <tr>
                <th></th>
                <th>Apr(24h / 7d)</th>
                <th>TVL / Cap</th>
                <th>Saturation</th>
                <th>My position</th>
                <th className='sticky'></th>
              </tr>
            </thead>
            <tbody>
              {poolsInfo?.liquidityPools?.map(p => {
                const balances = poolBalances?.find(b =>
                  b.faucetIdBech32 == p.faucetIdBech32
                );
                const tokenConfig = tokenConfigs?.find(c =>
                  c.faucetIdBech32 === p.faucetIdBech32
                );
                return balances
                  ? (
                    <LiquidityPoolRow
                      tokenConfig={tokenConfig}
                      key={p.faucetIdBech32}
                      pool={p}
                      poolBalances={balances}
                      managePool={openPoolManagementModal}
                      lpBalance={lpBalances[p.faucetIdBech32]}
                    />
                  )
                  : (
                    <tr key={p.faucetId + '-skeleton'}>
                      <td>
                      </td>
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
};

export default LiquidityPoolsTable;
