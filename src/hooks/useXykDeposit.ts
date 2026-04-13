import { clientMutex } from '@/lib/clientMutex';
import { compileXykDepositTransaction } from '@/lib/XykDepositNote';
import { bech32ToAccountId } from '@/lib/utils';
import { useRpcWorker } from '@/hooks/useRpcWorker';
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
  const { invalidateCache } = useRpcWorker();

  const deposit = useCallback(
    async (
      amount0: bigint,
      amount1: bigint,
      options?: {
        onProgress?: (step: number) => void;
        waitForNoteConsumed?: (noteId: string) => Promise<void>;
      },
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
      const onProgress = options?.onProgress;
      const waitForNoteConsumed = options?.waitForNoteConsumed;
      setError('');
      setIsLoading(true);
      try {
        await syncState();
        onProgress?.(0);
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
        onProgress?.(1);
        const txIdResult = await requestTransaction({
          type: TransactionType.Custom,
          payload: tx,
        });
        setNoteId(nid);
        setTxId(txIdResult);
        onProgress?.(2);
        if (waitForNoteConsumed) {
          await waitForNoteConsumed(nid);
        }
        if (poolId) await invalidateCache(poolId);
        await syncState();
        return { noteId: nid, txId: txIdResult };
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(`Error adding liquidity: ${message}`);
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
      invalidateCache,
    ],
  );

  return useMemo(
    () => ({ deposit, isLoading, error, txId, noteId }),
    [deposit, isLoading, error, txId, noteId],
  );
}
