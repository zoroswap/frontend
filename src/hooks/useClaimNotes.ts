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
  const { paraClient, accountId, walletType } = useUnifiedWallet();
  const { withClientLock, syncState } = useContext(ZoroContext);
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
    if (walletType !== 'para' || !paraClient || !accountId) {
      setPendingNotesCount(0);
      return;
    }
    try {
      // Use throttled syncState from context if sync requested
      if (sync) {
        await syncState();
      }
      const count = await withClientLock(async () => {
        const account = await paraClient.getAccount(accountId);
        if (!account) return 0;
        const consumableNotes = await paraClient.getConsumableNotes(account.id());
        return consumableNotes.length;
      });
      setPendingNotesCount(count);
    } catch (e) {
      console.error('Failed to fetch pending notes count:', e);
    }
  }, [paraClient, accountId, walletType, withClientLock, syncState]);

  // Fetch pending notes count periodically (with sync)
  useEffect(() => {
    if (walletType !== 'para' || !paraClient || !accountId) {
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
  }, [paraClient, accountId, walletType, refreshPendingNotes]);

  const claimNotes = useCallback(async () => {
    if (walletType !== 'para' || !paraClient || !accountId) {
      console.log('useClaimNotes: missing requirements', { walletType, hasClient: !!paraClient, hasAccountId: !!accountId });
      return { claimed: 0 };
    }

    // Set ref immediately to prevent concurrent access
    claimingRef.current = true;
    setClaiming(true);
    setError(null);

    try {
      const claimedCount = await withClientLock(async () => {
        console.log('useClaimNotes: syncing state');

        // Sync state first to discover pending notes (like miden-para example)
        await paraClient.syncState();

        console.log('useClaimNotes: getting account', accountId.toString());

        // Get the account first (like miden-para example does)
        const account = await paraClient.getAccount(accountId);
        if (!account) {
          throw new Error('Account not found');
        }

        console.log('useClaimNotes: getting consumable notes');

        // Get consumable notes for this account (using account.id() like miden-para)
        const consumableNotes = await paraClient.getConsumableNotes(account.id());

        console.log('useClaimNotes: found', consumableNotes.length, 'consumable notes');

        if (consumableNotes.length === 0) {
          return 0;
        }

        // Get note IDs as strings (matching miden-para example)
        const noteIds = consumableNotes.map((n) =>
          n.inputNoteRecord().id().toString()
        );

        console.log('useClaimNotes: creating consume transaction for notes', noteIds);

        // Use the helper method to create consume transaction request
        const consumeTxRequest = paraClient.newConsumeTransactionRequest(noteIds);

        // Submit transaction (executes, proves, and submits in one call)
        const txHash = await paraClient.submitNewTransaction(account.id(), consumeTxRequest);

        console.log('useClaimNotes: transaction submitted', txHash.toHex());

        return consumableNotes.length;
      });

      // Update pending notes count
      setPendingNotesCount(0);

      // Reset claiming state (ref first to allow periodic refresh)
      claimingRef.current = false;
      setClaiming(false);
      return { claimed: claimedCount };
    } catch (e) {
      console.error('useClaimNotes: error', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to claim notes';
      setError(errorMessage);
      claimingRef.current = false;
      setClaiming(false);
      throw e;
    }
  }, [paraClient, accountId, walletType, withClientLock]);

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
