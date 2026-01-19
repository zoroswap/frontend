import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { compileSwapTransaction } from '@/lib/ZoroSwapNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { TransactionType } from '@demox-labs/miden-wallet-adapter';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export const useSwap = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const { requestTransaction } = useUnifiedWallet();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { client, accountId, poolAccountId, syncState, startExpectingNotes } = useContext(ZoroContext);

  const swap = useCallback(async ({
    amount,
    minAmountOut,
    sellToken,
    buyToken,
  }: {
    amount: bigint;
    minAmountOut: bigint;
    buyToken: TokenConfig;
    sellToken: TokenConfig;
  }) => {
    if (!poolAccountId || !accountId || !client || !requestTransaction) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // Compilation doesn't use the client, only miden libs
      const { tx, noteId: newNoteId } = await compileSwapTransaction({
        amount,
        poolAccountId,
        buyToken,
        sellToken,
        minAmountOut: minAmountOut,
        userAccountId: accountId,
        client,
        syncState,
      });

      // Sync before and after tx submission (locking handled internally)
      await syncState();
      const newTxId = await requestTransaction({
        type: TransactionType.Custom,
        payload: tx,
      });
      await syncState();

      setNoteId(newNoteId);
      setTxId(newTxId);
      // Trigger wallet badge spinner until the swap result note can be claimed
      startExpectingNotes();
    } catch (err) {
      console.error(err);
      toast.error(
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>Error swapping</p>
          <p style={{ fontSize: '.875rem', opacity: 0.9 }}>
            {`${err}`}
          </p>
        </div>,
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, accountId, poolAccountId, requestTransaction, syncState, startExpectingNotes]);

  const value = useMemo(() => ({ swap, isLoading, error, txId, noteId }), [
    swap,
    error,
    isLoading,
    txId,
    noteId,
  ]);

  return value;
};
