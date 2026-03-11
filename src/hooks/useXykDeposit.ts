import { clientMutex } from '@/lib/clientMutex';
import { compileXykDepositTransaction } from '@/lib/XykDepositNote';
import { bech32ToAccountId } from '@/lib/utils';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useXykPool } from '@/hooks/useXykPool';
import { ZoroContext } from '@/providers/ZoroContext';
import { TransactionType } from '@demox-labs/miden-wallet-adapter';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export function useXykDeposit(poolId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { requestTransaction } = useUnifiedWallet();
  const { client, accountId, syncState } = useContext(ZoroContext);
  const { data: poolData } = useXykPool(poolId);

  const deposit = useCallback(
    async (
      amount0: bigint,
      amount1: bigint,
    ): Promise<{ noteId: string; txId: string | undefined } | undefined> => {
      if (
        !poolId ||
        !poolData ||
        !client ||
        !accountId ||
        !requestTransaction
      ) {
        return undefined;
      }
      const poolAccountId = bech32ToAccountId(poolId);
      if (!poolAccountId) return undefined;
      setError('');
      setIsLoading(true);
      try {
        await syncState();
        const { tx, noteId: nid } = await clientMutex.runExclusive(() =>
          compileXykDepositTransaction({
            poolAccountId,
            userAccountId: accountId,
            token0: poolData.token0.faucetId,
            token1: poolData.token1.faucetId,
            amount0,
            amount1,
            client,
          }),
        );
        const txIdResult = await requestTransaction({
          type: TransactionType.Custom,
          payload: tx,
        });
        await syncState();
        setNoteId(nid);
        setTxId(txIdResult);
        return { noteId: nid, txId: txIdResult };
      } catch (err) {
        console.error(err);
        toast.error(`Error adding liquidity: ${err}`);
      } finally {
        setIsLoading(false);
      }
      return undefined;
    },
    [
      poolId,
      poolData,
      client,
      accountId,
      requestTransaction,
      syncState,
    ],
  );

  return useMemo(
    () => ({ deposit, isLoading, error, txId, noteId }),
    [deposit, isLoading, error, txId, noteId],
  );
}
