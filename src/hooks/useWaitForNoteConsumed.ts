import { ZoroContext } from '@/providers/ZoroContext';
import { NoteId } from '@miden-sdk/miden-sdk';
import { useCallback, useContext } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 120_000;

export interface WaitForNoteConsumedOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/**
 * Returns a function that polls the Miden node via RPC to check whether
 * a note has been included in a block (i.e. the transaction was processed).
 *
 * Uses `rpcClient.getNotesById` directly instead of the local WebClient,
 * which may not know about notes submitted through a wallet adapter.
 */
export function useWaitForNoteConsumed(options: WaitForNoteConsumedOptions = {}) {
  const { rpcClient } = useContext(ZoroContext);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const waitForNoteConsumed = useCallback(
    (noteId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!rpcClient) {
          reject(new Error('RPC client not available'));
          return;
        }

        const deadline = Date.now() + timeoutMs;
        const timeout = setTimeout(() => {
          reject(new Error(`Transaction not confirmed within ${timeoutMs / 1000} seconds`));
        }, timeoutMs);

        const poll = async () => {
          if (Date.now() >= deadline) {
            clearTimeout(timeout);
            reject(new Error(`Transaction not confirmed within ${timeoutMs / 1000} seconds`));
            return;
          }
          try {
            // Create a fresh NoteId each poll — WASM objects can't be reused after
            // being passed to another WASM function.
            const notes = await rpcClient.getNotesById([NoteId.fromHex(noteId)]);
            if (notes.length > 0) {
              clearTimeout(timeout);
              resolve();
              return;
            }
          } catch {
            // Note not found yet — keep polling
          }
          setTimeout(poll, pollIntervalMs);
        };

        poll();
      }),
    [rpcClient, pollIntervalMs, timeoutMs],
  );

  return waitForNoteConsumed;
}
