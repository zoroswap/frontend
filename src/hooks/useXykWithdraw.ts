import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useXykPool } from '@/hooks/useXykPool';
import { clientMutex } from '@/lib/clientMutex';
import { bech32ToAccountId } from '@/lib/utils';
import { compileXykWithdrawTransaction } from '@/lib/XykWithdrawNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { TransactionType } from '@demox-labs/miden-wallet-adapter';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export function useXykWithdraw(poolId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [txId, setTxId] = useState<undefined | string>();
  const [noteId, setNoteId] = useState<undefined | string>();
  const { requestTransaction } = useUnifiedWallet();
  const { client, accountId, syncState } = useContext(ZoroContext);
  const { data: poolData } = useXykPool(poolId);

  const withdraw = useCallback(
    async (
      lpAmount: bigint,
    ): Promise<{ noteId: string; txId: string | undefined } | undefined> => {
      if (
        !poolId
        || !poolData
        || !client
        || !accountId
        || !requestTransaction
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
          compileXykWithdrawTransaction({
            poolAccountId,
            userAccountId: accountId,
            token0: poolData.token0.faucetId,
            token1: poolData.token1.faucetId,
            lpAmount,
            client,
          })
        );
        const txIdResult = await requestTransaction({
          type: TransactionType.Custom,
          payload: tx,
        });
        await syncState();
        setNoteId(nid);
        setTxId(txIdResult);

        console.log(txIdResult, nid);

        // const consumeReq = new TransactionRequestBuilder()
        //   .withInputNotes(
        //     new NoteAndArgsArray([new NoteAndArgs(withdrawNote, null)]),
        //   )
        //   .withExpectedOutputRecipients(
        //     new NoteRecipientArray([returnNote.recipient()]),
        //   )
        //   .build();
        // await client.submitNewTransaction(poolAccountId, consumeReq);
        // await syncState();

        return { noteId: nid, txId: txIdResult };
      } catch (err) {
        console.error(err);
        toast.error(`Error withdrawing liquidity: ${err}`);
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
    () => ({ withdraw, isLoading, error, txId, noteId }),
    [withdraw, isLoading, error, txId, noteId],
  );
}
