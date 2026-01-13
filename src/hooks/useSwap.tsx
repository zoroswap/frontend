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
  const { client, accountId, poolAccountId, withClientLock } = useContext(ZoroContext);

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
      // Use withClientLock to protect the entire compilation and sync operations
      const { noteId: newNoteId, txId: newTxId } = await withClientLock(async () => {
        const { tx, noteId } = await compileSwapTransaction({
          amount,
          poolAccountId,
          buyToken,
          sellToken,
          minAmountOut: minAmountOut,
          userAccountId: accountId,
          client,
          syncState: async () => { /* syncState is done inside the lock already */ },
        });
        await client.syncState();
        const txId = await requestTransaction({
          type: TransactionType.Custom,
          payload: tx,
        });
        await client.syncState();
        return { tx, noteId, txId };
      });
      setNoteId(newNoteId);
      setTxId(newTxId);
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
  }, [client, accountId, poolAccountId, requestTransaction, withClientLock]);

  const value = useMemo(() => ({ swap, isLoading, error, txId, noteId }), [
    swap,
    error,
    isLoading,
    txId,
    noteId,
  ]);

  return value;
};
