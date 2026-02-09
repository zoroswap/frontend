import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { ZoroContext } from '@/providers/ZoroContext';
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
      console.log('useClaimNotes: missing requirements', { walletType, hasAccountId: !!accountId });
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

      // Convert consumable note records to Note objects
      const noteObjects = notes.map((n) => n.inputNoteRecord().toNote());

      console.log('useClaimNotes: consuming', noteObjects.length, 'notes');

      // Consume the notes (locking handled internally)
      const txHash = await consumeNotes(accountId, noteObjects);

      console.log('useClaimNotes: transaction submitted', txHash);

      // Refresh pending notes count
      await refreshPendingNotes();

      setClaiming(false);
      return { claimed: notes.length };
    } catch (e) {
      console.error('useClaimNotes: error', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to claim notes';
      setError(errorMessage);
      setClaiming(false);
      throw e;
    }
  }, [accountId, walletType, syncState, getConsumableNotes, consumeNotes, refreshPendingNotes]);

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
