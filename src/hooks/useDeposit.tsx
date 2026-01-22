import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { API } from '@/lib/config';
import { compileDepositTransaction } from '@/lib/ZoroDepositNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { NoteType } from '@demox-labs/miden-sdk';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export const useDeposit = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const { requestTransaction } = useUnifiedWallet();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { client, accountId, poolAccountId, syncState } = useContext(ZoroContext);

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
    if (!poolAccountId || !accountId || !client || !requestTransaction) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { tx, noteId, note } = await compileDepositTransaction({
        amount,
        poolAccountId,
        token,
        minAmountOut: minAmountOut,
        userAccountId: accountId,
        client,
        syncState,
        noteType,
      });
      const txId = await requestTransaction(tx);
      await syncState();
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
  }, [client, accountId, poolAccountId, requestTransaction, syncState]);

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
