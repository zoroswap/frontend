import { ZoroContext } from '@/providers/ZoroContext';
import { useCallback, useContext } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60_000;

export interface WaitForNoteConsumedOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/**
 * Returns a function that waits until the given note is reported as consumed
 * (via getNoteStatus). Polls getNoteStatus(noteId); resolves when status is 'consumed'.
 * Rejects if the note is not consumed within timeoutMs.
 */
export function useWaitForNoteConsumed(options: WaitForNoteConsumedOptions = {}) {
  const { getNoteStatus } = useContext(ZoroContext);
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
          try {
            const status = await getNoteStatus(noteId);
            if (status === 'consumed') {
              clearTimeout(timeout);
              resolve();
              return;
            }
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
            return;
          }
          setTimeout(poll, pollIntervalMs);
        };

        poll();
      }),
    [getNoteStatus, pollIntervalMs, timeoutMs],
  );

  return waitForNoteConsumed;
}
