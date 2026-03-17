import { parseAccountIdString } from '@/lib/utils';
import { useMiden, useAccount } from '@miden-sdk/react';
import { useEffect, useRef } from 'react';

const importedAccountIds = new Set<string>();

/**
 * Same as useAccount from @miden-sdk/react, but ensures the account is imported
 * (client.importAccountById + sync) before use, so "No account header record found" is avoided.
 */
export function useAccountWithImport(accountId: string | undefined) {
  const { client, isReady } = useMiden();
  const result = useAccount(accountId);
  const lastTriedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !client || !accountId?.trim()) return;
    const id = accountId.trim();
    if (importedAccountIds.has(id)) return;
    if (lastTriedRef.current === id) return;
    lastTriedRef.current = id;

    const accountIdObj = parseAccountIdString(id);
    if (!accountIdObj) return;

    (async () => {
      try {
        await client.importAccountById(accountIdObj);
        importedAccountIds.add(id);
        // Do not call syncState() here: it updates lastSyncTime globally and triggers
        // refetch in every useAccount instance, causing a refetch storm and eventual hang.
        // Rely on MidenProvider's autoSyncInterval or manual sync elsewhere.
      } catch (e) {
        console.warn('Account import failed for', id, e);
        lastTriedRef.current = null;
      }
    })();
  }, [isReady, client, accountId]);

  return result;
}
