import { useMiden } from '@miden-sdk/react';
import { OutputNoteState } from '@miden-sdk/miden-sdk';
import { useCallback } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60_000;

export interface WaitForNoteConsumedOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export function useWaitForNoteConsumed(options: WaitForNoteConsumedOptions = {}) {
  const { client, runExclusive } = useMiden();
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const waitForNoteConsumed = useCallback(
    (noteId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;
        const timeout = setTimeout(() => {
          reject(new Error('Note was not consumed within 60 seconds'));
        }, timeoutMs);

        const poll = async () => {
          if (Date.now() >= deadline) {
            clearTimeout(timeout);
            reject(new Error('Note was not consumed within 60 seconds'));
            return;
          }
          if (!client) {
            setTimeout(poll, pollIntervalMs);
            return;
          }
          try {
            await runExclusive(async () => {
              const summary = await client.syncState();
              const consumedIds = summary.consumedNotes().map((id: { toString: () => string }) => id.toString());
              if (consumedIds.includes(noteId)) {
                clearTimeout(timeout);
                resolve();
                return;
              }
              const record = await client.getOutputNote(noteId);
              const state = record.state();
              if (state === OutputNoteState.Consumed) {
                clearTimeout(timeout);
                resolve();
                return;
              }
            });
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
            return;
          }
          setTimeout(poll, pollIntervalMs);
        };

        poll();
      }),
    [client, runExclusive, pollIntervalMs, timeoutMs],
  );

  return waitForNoteConsumed;
}
