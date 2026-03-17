import { ZoroContext } from '@/providers/ZoroContext';
import { useConsume, useNotes, useSyncState } from '@miden-sdk/react';
import { useCallback, useContext, useState } from 'react';

export function useClaimNotes() {
  const { accountId, isExpectingNotes, pendingNotesCount } = useContext(ZoroContext);
  const accountIdStr = accountId?.toString();
  const { sync } = useSyncState();
  const { consumableNotes, refetch } = useNotes({
    accountId: accountIdStr ?? undefined,
    status: 'committed',
  });
  const { consume, isLoading: claiming, error: consumeError } = useConsume();
  const [error, setError] = useState<string | null>(null);

  const claimNotes = useCallback(async () => {
    if (!accountIdStr) return { claimed: 0 };
    setError(null);
    try {
      await sync();
      const notes = consumableNotes;
      if (notes.length === 0) return { claimed: 0 };
      const noteIds = notes.map(n => {
        const rec = n.inputNoteRecord();
        return rec.id().toString();
      });
      await consume({ accountId: accountIdStr, noteIds });
      await refetch();
      return { claimed: notes.length };
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : String(e);
      const isExecutorError = /transaction executor error|failed to execute transaction|error during processing of event/i.test(rawMessage);
      const errorMessage = isExecutorError
        ? 'The node rejected the claim transaction. This can happen if a note was already consumed, the note type is not supported for claiming here, or the node is out of sync. Try syncing again or reconnecting your wallet.'
        : rawMessage || 'Failed to claim notes';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [accountIdStr, consumableNotes, sync, consume, refetch]);

  return {
    claimNotes,
    claiming,
    error: error ?? consumeError?.message ?? null,
    isParaWallet: false,
    isExpectingNotes,
    pendingNotesCount,
    refreshPendingNotes: refetch,
  };
}
