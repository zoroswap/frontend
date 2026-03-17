import { useXykPool } from '@/hooks/useXykPool';
import { clientMutex } from '@/lib/clientMutex';
import { bech32ToAccountId } from '@/lib/utils';
import { compileXykWithdrawTransaction } from '@/lib/XykWithdrawNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { TransactionRequest as TxRequest } from '@miden-sdk/miden-sdk';
import { useMiden, useSyncState, useTransaction } from '@miden-sdk/react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export function useXykWithdraw(poolId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { client } = useMiden();
  const { sync } = useSyncState();
  const { execute } = useTransaction();
  const { accountId } = useContext(ZoroContext);
  const { data: poolData } = useXykPool(poolId);

  const withdraw = useCallback(
    async (
      lpAmount: bigint,
      options?: {
        onProgress?: (step: number) => void;
        waitForNoteConsumed?: (noteId: string) => Promise<void>;
      },
    ): Promise<{ noteId: string; txId: string | undefined } | undefined> => {
      if (
        !poolId
        || !poolData
        || !client
        || !accountId
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
        await sync();
        onProgress?.(0);
        const { tx, noteId: nid } = await clientMutex.runExclusive(() =>
          compileXykWithdrawTransaction({
            poolAccountId,
            userAccountId: accountId,
            token0: poolData.token0.faucetId,
            token1: poolData.token1.faucetId,
            lpAmount,
            client,
          })
        );
        onProgress?.(1);
        const custom = tx as { transactionRequest: string };
        const txRequestBytes = Uint8Array.from(atob(custom.transactionRequest), c => c.charCodeAt(0));
        const txRequest = TxRequest.deserialize(txRequestBytes);
        const result = await execute({ accountId: accountId.toString(), request: txRequest });
        const txIdResult = result.transactionId;
        setNoteId(nid);
        setTxId(txIdResult);
        onProgress?.(2);
        if (waitForNoteConsumed) {
          await waitForNoteConsumed(nid);
        }
        await sync();
        return { noteId: nid, txId: txIdResult };
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(`Error withdrawing liquidity: ${message}`);
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
      sync,
      execute,
    ],
  );

  return useMemo(
    () => ({ withdraw, isLoading, error, txId, noteId }),
    [withdraw, isLoading, error, txId, noteId],
  );
}
