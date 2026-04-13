import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { ZoroContext } from '@/providers/ZoroContext';
import type { Note } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useState } from 'react';

export function useClaimNotes() {
  const { accountId, walletType } = useUnifiedWallet();
  const {
    syncState,
    getConsumableNotes,
    consumeNotes,
    pendingNotesCount,
    isExpectingNotes,
    refreshPendingNotes,
  } = useContext(ZoroContext);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimNotes = useCallback(async () => {
    if (walletType !== 'para' || !accountId) {
      console.log('useClaimNotes: missing requirements', {
        walletType,
        hasAccountId: !!accountId,
      });
      return { claimed: 0 };
    }

    setClaiming(true);
    setError(null);

    try {
      // Sync and get consumable notes
      await syncState();
      const notes = await getConsumableNotes(accountId);

      console.log('useClaimNotes: found', notes.length, 'consumable notes');

      if (notes.length === 0) {
        setClaiming(false);
        return { claimed: 0 };
      }

      // Convert consumable note records to Note objects; skip any that fail (e.g. wrong note type)
      const noteObjects: Note[] = [];
      for (const n of notes) {
        try {
          const note = n.inputNoteRecord().toNote();
          if (note) noteObjects.push(note);
        } catch (err) {
          console.warn('useClaimNotes: skipped a note that could not be converted', err);
        }
      }

      if (noteObjects.length === 0) {
        console.warn('useClaimNotes: no notes could be converted to consumable format');
        setClaiming(false);
        return { claimed: 0 };
      }

      console.log('useClaimNotes: consuming', noteObjects[0].assets(), 'notes');

      // Consume the notes (locking handled internally)
      const txHash = await consumeNotes(accountId, noteObjects);

      console.log('useClaimNotes: transaction submitted', txHash);

      // Refresh pending notes count
      await refreshPendingNotes();

      setClaiming(false);
      return { claimed: notes.length };
    } catch (e) {
      console.error('useClaimNotes: error', e);
      const rawMessage = e instanceof Error ? e.message : String(e);
      const isExecutorError =
        /transaction executor error|failed to execute transaction|error during processing of event/i
          .test(
            rawMessage,
          );
      const errorMessage = isExecutorError
        ? 'The node rejected the claim transaction. This can happen if a note was already consumed, the note type is not supported for claiming here, or the node is out of sync. Try syncing again or reconnecting your wallet.'
        : rawMessage || 'Failed to claim notes';
      setError(errorMessage);
      setClaiming(false);
      throw new Error(errorMessage);
    }
  }, [
    accountId,
    walletType,
    syncState,
    getConsumableNotes,
    consumeNotes,
    refreshPendingNotes,
  ]);

  return {
    claimNotes,
    claiming,
    error,
    isParaWallet: walletType === 'para',
    isExpectingNotes,
    pendingNotesCount,
    refreshPendingNotes,
  };
}
