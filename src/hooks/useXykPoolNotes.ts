import { accountIdToBech32, bech32ToAccountId } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import type { XykPoolData } from '@/hooks/useXykPool';
import { NoteTag } from '@miden-sdk/miden-sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface XykPoolNoteAsset {
  faucetIdBech32: string;
  amount: bigint;
}

export interface XykPoolNoteRow {
  noteId: string;
  assets: XykPoolNoteAsset[];
  /** Implied price (token1 per token0) from asset ratio if note has both pool tokens. */
  impliedPrice?: number;
}

export function useXykPoolNotes(
  poolId: string | undefined,
  poolData: XykPoolData | null,
) {
  const { rpcClient } = useContext(ZoroContext);
  const [notes, setNotes] = useState<XykPoolNoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!poolId || !rpcClient || !poolData) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const poolAccountId = bech32ToAccountId(poolId);
      if (!poolAccountId) {
        setNotes([]);
        return;
      }
      const tag = NoteTag.withAccountTarget(poolAccountId);
      const syncInfo = await rpcClient.syncNotes(0, null, [tag]);
      const committed = syncInfo.notes();
      if (committed.length === 0) {
        setNotes([]);
        return;
      }
      const noteIds = committed.map((c) => c.noteId());
      const fetched = await rpcClient.getNotesById(noteIds);
      const rows: XykPoolNoteRow[] = fetched.map((f) => {
        const note = f.note;
        const noteId = f.noteId.toString();
        const assets: XykPoolNoteAsset[] = [];
        let impliedPrice: number | undefined;
        if (note) {
          const noteAssets = note.assets();
          if (noteAssets) {
            const fungible = noteAssets.fungibleAssets();
            const token0Bech32 = poolData.token0.faucetIdBech32;
            const token1Bech32 = poolData.token1.faucetIdBech32;
            let amt0: bigint | undefined;
            let amt1: bigint | undefined;
            for (let j = 0; j < fungible.length; j++) {
              const fa = fungible[j];
              const fid = accountIdToBech32(fa.faucetId());
              const amt = fa.amount();
              assets.push({ faucetIdBech32: fid, amount: amt });
              if (fid === token0Bech32) amt0 = amt;
              if (fid === token1Bech32) amt1 = amt;
            }
            if (amt0 != null && amt1 != null && amt0 > 0n) {
              const h0 = Number(amt0) / 10 ** poolData.token0.decimals;
              const h1 = Number(amt1) / 10 ** poolData.token1.decimals;
              impliedPrice = h1 / h0;
            }
          }
        }
        return { noteId, assets, impliedPrice };
      });
      setNotes(rows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, rpcClient, poolData]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return useMemo(
    () => ({ notes, isLoading, error, refetch }),
    [notes, isLoading, error, refetch],
  );
}
