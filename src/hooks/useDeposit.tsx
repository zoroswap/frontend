import { clientMutex } from '@/lib/clientMutex';
import { API } from '@/lib/config';
import { compileDepositTransaction } from '@/lib/ZoroDepositNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { NoteType, TransactionRequest as TxRequest } from '@miden-sdk/miden-sdk';
import { useMiden, useSyncState, useTransaction } from '@miden-sdk/react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export const useDeposit = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { client } = useMiden();
  const { sync } = useSyncState();
  const { execute } = useTransaction();
  const { accountId, poolAccountId } = useContext(ZoroContext);

  const deposit = useCallback(async ({
    amount,
    minAmountOut,
    token,
    noteType,
  }: {
    amount: bigint;
    minAmountOut: bigint;
    token: TokenConfig;
    noteType: NoteType;
  }) => {
    if (!poolAccountId || !accountId || !client) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sync();

      const { tx, noteId, note } = await clientMutex.runExclusive(() =>
        compileDepositTransaction({
          amount,
          poolAccountId,
          token,
          minAmountOut: minAmountOut,
          userAccountId: accountId,
          client,
          noteType,
        })
      );
      const custom = tx as { transactionRequest: string };
      const txRequestBytes = Uint8Array.from(atob(custom.transactionRequest), c => c.charCodeAt(0));
      const txRequest = TxRequest.deserialize(txRequestBytes);
      const result = await execute({ accountId: accountId.toString(), request: txRequest });
      const txId = result.transactionId;
      await sync();
      if (noteType === NoteType.Private) {
        const serialized = btoa(
          String.fromCharCode.apply(null, note.serialize() as unknown as number[]),
        );
        await new Promise(r => setTimeout(r, 10000));
        await submitNoteToServer(serialized);
      }
      setNoteId(noteId);
      setTxId(txId);
    } catch (err) {
      console.error(err);
      toast.error(
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>Error depositing</p>
          <p style={{ fontSize: '.875rem', opacity: 0.9 }}>
            {`${err}`}
          </p>
        </div>,
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, accountId, poolAccountId, sync, execute]);

  const value = useMemo(() => ({ deposit, isLoading, error, txId, noteId }), [
    deposit,
    error,
    isLoading,
    txId,
    noteId,
  ]);

  return value;
};

async function submitNoteToServer(serializedNote: string) {
  try {
    const response = await fetch(`${API.endpoint}/deposit/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note_data: serializedNote,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error('Failed to submit note to server:', error);
    throw error;
  }
}
