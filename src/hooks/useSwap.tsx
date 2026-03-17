import { clientMutex } from '@/lib/clientMutex';
import { compileSwapTransaction } from '@/lib/ZoroSwapNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { TransactionRequest as TxRequest } from '@miden-sdk/miden-sdk';
import { useMiden, useSyncState, useTransaction } from '@miden-sdk/react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export const useSwap = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { client } = useMiden();
  const { sync } = useSyncState();
  const { execute } = useTransaction();
  const { accountId, poolAccountId, startExpectingNotes } = useContext(ZoroContext);

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
    if (!poolAccountId || !accountId || !client) return;
    setError('');
    setIsLoading(true);
    try {
      await sync();
      const { tx, noteId: newNoteId } = await clientMutex.runExclusive(() =>
        compileSwapTransaction({
          amount,
          poolAccountId,
          buyToken,
          sellToken,
          minAmountOut,
          userAccountId: accountId,
          client,
        }),
      );
      const custom = tx as { transactionRequest: string };
      const txRequestBytes = Uint8Array.from(atob(custom.transactionRequest), c => c.charCodeAt(0));
      const txRequest = TxRequest.deserialize(txRequestBytes);
      const result = await execute({ accountId: accountId.toString(), request: txRequest });
      const newTxId = result.transactionId;
      await sync();
      setNoteId(newNoteId);
      setTxId(newTxId);
      startExpectingNotes();
    } catch (err) {
      console.error(err);
      toast.error(
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>Error swapping</p>
          <p style={{ fontSize: '.875rem', opacity: 0.9 }}>{`${err}`}</p>
        </div>,
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, accountId, poolAccountId, sync, startExpectingNotes, execute]);

  const value = useMemo(() => ({ swap, isLoading, error, txId, noteId }), [
    swap,
    error,
    isLoading,
    txId,
    noteId,
  ]);

  return value;
};
