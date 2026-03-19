import { clientMutex } from '@/lib/clientMutex';
import { compileXykSwapTransaction } from '@/lib/XykSwapNote';
import { bech32ToAccountId } from '@/lib/utils';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useXykPool } from '@/hooks/useXykPool';
import { ZoroContext } from '@/providers/ZoroContext';
import { TransactionType } from '@demox-labs/miden-wallet-adapter';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export function useXykSwap(poolId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { requestTransaction } = useUnifiedWallet();
  const { client, accountId, syncState } = useContext(ZoroContext);
  const { data: poolData } = useXykPool(poolId);

  const swap = useCallback(
    async (
      sellToken: AccountId,
      buyToken: AccountId,
      amount: bigint,
      minAmountOut: bigint,
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
          compileXykSwapTransaction({
            poolAccountId,
            userAccountId: accountId,
            sellToken,
            buyToken,
            amount,
            minAmountOut,
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
        await syncState();
        return { noteId: nid, txId: txIdResult };
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(`Error swapping: ${message}`);
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
    () => ({ swap, isLoading, error, txId, noteId }),
    [swap, isLoading, error, txId, noteId],
  );
}
