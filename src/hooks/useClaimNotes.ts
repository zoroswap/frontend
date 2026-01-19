import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

// Shared state for minting status (so wallet button can show loading)
// Tracks how many notes we're expecting to arrive
let expectedNotes = 0;
let lastKnownCount = -1;
const mintingListeners = new Set<(waiting: boolean) => void>();

function notifyMintingListeners() {
  mintingListeners.forEach(listener => listener(expectedNotes > 0));
}

// Call when user initiates a faucet mint
export function startMinting() {
  expectedNotes++;
  notifyMintingListeners();
}

// Call whenever pending notes count is updated: detects when notes arrive
export function updatePendingNotesTracking(newCount: number) {
  if (lastKnownCount >= 0 && newCount > lastKnownCount && expectedNotes > 0) {
    // Notes arrived, decrease expected count by number of new notes
    const arrived = newCount - lastKnownCount;
    expectedNotes = Math.max(0, expectedNotes - arrived);
    notifyMintingListeners();
  }
  lastKnownCount = newCount;
}

export function useClaimNotes() {
  const { accountId, walletType } = useUnifiedWallet();
  const { syncState, getConsumableNotes, consumeNotes } = useContext(ZoroContext);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotesCount, setPendingNotesCount] = useState<number>(0);
  const [isMinting, setIsMinting] = useState(expectedNotes > 0);
  const claimingRef = useRef(claiming);
  claimingRef.current = claiming;

  // Subscribe to minting state changes
  useEffect(() => {
    const listener = (waiting: boolean) => setIsMinting(waiting);
    mintingListeners.add(listener);
    return () => { mintingListeners.delete(listener); };
  }, []);

  // Track pending notes count changes to detect when notes arrive
  useEffect(() => {
    updatePendingNotesTracking(pendingNotesCount);
  }, [pendingNotesCount]);

  // Fetch pending notes count
  const refreshPendingNotes = useCallback(async (sync = false) => {
    if (walletType !== 'para' || !accountId) {
      setPendingNotesCount(0);
      return;
    }
    try {
      if (sync) {
        await syncState();
      }
      const notes = await getConsumableNotes(accountId);
      setPendingNotesCount(notes.length);
    } catch (e) {
      console.error('Failed to fetch pending notes count:', e);
    }
  }, [accountId, walletType, syncState, getConsumableNotes]);

  // Fetch pending notes count periodically (with sync)
  useEffect(() => {
    if (walletType !== 'para' || !accountId) {
      return;
    }

    const doRefresh = () => {
      if (!claimingRef.current) {
        refreshPendingNotes(true);
      }
    };

    doRefresh();
    const interval = setInterval(doRefresh, 3000);
    return () => clearInterval(interval);
  }, [accountId, walletType, refreshPendingNotes]);

  const claimNotes = useCallback(async () => {
    if (walletType !== 'para' || !accountId) {
      console.log('useClaimNotes: missing requirements', { walletType, hasAccountId: !!accountId });
      return { claimed: 0 };
    }

    // Set ref immediately to prevent concurrent access
    claimingRef.current = true;
    setClaiming(true);
    setError(null);

    try {
      // Sync and get consumable notes
      await syncState();
      const notes = await getConsumableNotes(accountId);

      console.log('useClaimNotes: found', notes.length, 'consumable notes');

      if (notes.length === 0) {
        claimingRef.current = false;
        setClaiming(false);
        return { claimed: 0 };
      }

      // Get note IDs as strings
      const noteIds = notes.map((n) => n.inputNoteRecord().id().toString());

      console.log('useClaimNotes: consuming notes', noteIds);

      // Consume the notes (locking handled internally)
      const txHash = await consumeNotes(accountId, noteIds);

      console.log('useClaimNotes: transaction submitted', txHash);

      // Update pending notes count
      setPendingNotesCount(0);

      // Reset claiming state (ref first to allow periodic refresh)
      claimingRef.current = false;
      setClaiming(false);
      return { claimed: notes.length };
    } catch (e) {
      console.error('useClaimNotes: error', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to claim notes';
      setError(errorMessage);
      claimingRef.current = false;
      setClaiming(false);
      throw e;
    }
  }, [accountId, walletType, syncState, getConsumableNotes, consumeNotes]);

  return {
    claimNotes,
    claiming,
    error,
    isParaWallet: walletType === 'para',
    isMinting,
    pendingNotesCount,
    refreshPendingNotes,
  };
}
