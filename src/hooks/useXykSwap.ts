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
        toast.error(`Error swapping: ${err}`);
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
