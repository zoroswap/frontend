import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { clientMutex } from '@/lib/clientMutex';
import {
  getPositionInfo,
  getPositionNote,
  type PositionInfoResponse,
  registerPosition,
  submitPositionSwap,
} from '@/lib/positionsApi';
import {
  clearStoredPositionId,
  getStoredPositionId,
  setStoredPositionId,
} from '@/lib/positionStorage';
import {
  compileOpenPositionTransaction,
  compileReclaimPositionTransaction,
  type PositionAssetInput,
  serializeNoteToBase64,
} from '@/lib/ZoroPositionNote';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { Note } from '@miden-sdk/miden-sdk';
import { TransactionType } from '@miden-sdk/miden-wallet-adapter';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export interface PositionSwapResult {
  orderId: string;
}

export function usePosition() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [positionInfo, setPositionInfo] = useState<PositionInfoResponse | null>(null);
  const { requestTransaction } = useUnifiedWallet();
  const { client, accountId, poolAccountId, syncState } = useContext(ZoroContext);

  useEffect(() => {
    if (!accountId) {
      setPositionId(null);
      return;
    }
    setPositionId(getStoredPositionId(accountId));
  }, [accountId]);

  const refreshPositionInfo = useCallback(
    async (id?: string): Promise<PositionInfoResponse | null> => {
      const targetId = id ?? positionId;
      if (!targetId) {
        setPositionInfo(null);
        return null;
      }
      setIsRefreshing(true);
      try {
        const info = await getPositionInfo(targetId);
        setPositionInfo(info);
        return info;
      } catch (err) {
        console.error(err);
        return null;
      } finally {
        setIsRefreshing(false);
      }
    },
    [positionId],
  );

  useEffect(() => {
    if (!positionId) return;
    const intervalId = setInterval(() => {
      void refreshPositionInfo(positionId);
    }, 15_000);
    return () => clearInterval(intervalId);
  }, [positionId, refreshPositionInfo]);

  const verifyPosition = useCallback(async (id: string) => {
    try {
      await getPositionNote(id);
      return true;
    } catch {
      if (accountId) {
        clearStoredPositionId(accountId);
        setPositionId(null);
      }
      return false;
    }
  }, [accountId]);

  useEffect(() => {
    if (positionId) {
      void verifyPosition(positionId);
      void refreshPositionInfo(positionId);
    } else {
      setPositionInfo(null);
    }
  }, [positionId, verifyPosition, refreshPositionInfo]);

  const openPosition = useCallback(async ({
    assets,
  }: {
    assets: PositionAssetInput[];
  }) => {
    if (!poolAccountId || !accountId || !client || !requestTransaction) {
      return;
    }
    if (assets.length === 0) {
      throw new Error('At least one asset is required');
    }
    setIsLoading(true);
    try {
      await syncState();

      const { tx, note } = await clientMutex.runExclusive(() =>
        compileOpenPositionTransaction({
          poolAccountId,
          userAccountId: accountId,
          assets,
          client,
        })
      );

      await requestTransaction({
        type: TransactionType.Custom,
        payload: tx,
      });
      await syncState();

      const noteData = serializeNoteToBase64(note);
      const result = await registerPosition(noteData);
      setStoredPositionId(accountId, result.position_id);
      setPositionId(result.position_id);

      toast.success('Position opened');
      return result.position_id;
    } catch (err) {
      console.error(err);
      toast.error(`Error opening position: ${err}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [accountId, client, poolAccountId, requestTransaction, syncState]);

  const positionSwap = useCallback(async ({
    sellToken,
    buyToken,
    amount,
    minAmountOut,
  }: {
    sellToken: TokenConfig;
    buyToken: TokenConfig;
    amount: bigint;
    minAmountOut: bigint;
  }): Promise<PositionSwapResult> => {
    if (!positionId) {
      throw new Error('No position open');
    }
    setIsLoading(true);
    try {
      const result = await submitPositionSwap({
        position_id: positionId,
        asset_in: sellToken.faucetIdBech32,
        asset_out: buyToken.faucetIdBech32,
        amount_in: Number(amount),
        min_amount_out: Number(minAmountOut),
      });
      return { orderId: result.order_id };
    } catch (err) {
      console.error(err);
      toast.error(`Error swapping via position: ${err}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  const reclaimPosition = useCallback(async () => {
    if (!positionId || !accountId || !requestTransaction) {
      return;
    }
    setIsLoading(true);
    try {
      await syncState();
      const { note_data } = await getPositionNote(positionId);
      const bytes = Uint8Array.from(atob(note_data), c => c.charCodeAt(0));
      const note = Note.deserialize(bytes);

      const tx = compileReclaimPositionTransaction(accountId, note);
      await requestTransaction({
        type: TransactionType.Custom,
        payload: tx,
      });
      await syncState();

      clearStoredPositionId(accountId);
      setPositionId(null);
      toast.success('Position reclaimed');
    } catch (err) {
      console.error(err);
      toast.error(`Error reclaiming position: ${err}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [accountId, positionId, requestTransaction, syncState]);

  const removePosition = useCallback(() => {
    if (!accountId || !positionId) {
      return;
    }
    clearStoredPositionId(accountId);
    setPositionId(null);
    setPositionInfo(null);
    toast.success('Position removed');
  }, [accountId, positionId]);

  return useMemo(() => ({
    positionId,
    positionInfo,
    refreshPositionInfo,
    isLoading,
    isRefreshing,
    openPosition,
    positionSwap,
    reclaimPosition,
    removePosition,
    hasPosition: positionId != null,
  }), [
    positionId,
    positionInfo,
    refreshPositionInfo,
    isLoading,
    isRefreshing,
    openPosition,
    positionSwap,
    reclaimPosition,
    removePosition,
  ]);
}
