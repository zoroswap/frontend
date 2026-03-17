import { accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { useCreateFaucet, useMint } from '@miden-sdk/react';
import { useCallback, useContext, useMemo, useState } from 'react';

export interface FaucetParams {
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

export interface LaunchSuccess {
  txId: string;
  faucetIdBech32: string;
}

const MIDENSCAN_BASE = 'https://testnet.midenscan.com';

export function getMidenscanTxUrl(txId: string): string {
  return `${MIDENSCAN_BASE}/tx/${txId}`;
}

export function getMidenscanAccountUrl(accountBech32: string): string {
  return `${MIDENSCAN_BASE}/account/${accountBech32}`;
}

export function getMidenscanNoteUrl(noteId: string): string {
  return `${MIDENSCAN_BASE}/note/${noteId}`;
}

export const LAUNCH_STEPS = [
  'Creating faucet',
  'Minting initial supply',
  'Finalizing',
] as const;

export type LaunchStepIndex = 0 | 1 | 2;

export default function useLaunchpad() {
  const [error, setError] = useState<string>('');
  const { accountId } = useContext(ZoroContext);
  const { createFaucet } = useCreateFaucet();
  const { mint } = useMint();

  const clearError = useCallback(() => setError(''), []);

  const launchToken = useCallback(
    async (
      params: FaucetParams,
      options?: { onProgress?: (step: LaunchStepIndex) => void },
    ): Promise<LaunchSuccess | undefined> => {
      setError('');
      const onProgress = options?.onProgress;
      try {
        if (!accountId) {
          throw new Error('Connect your wallet to use the launchpad');
        }
        onProgress?.(0);
        const faucet = await createFaucet({
          tokenSymbol: params.symbol,
          decimals: params.decimals,
          maxSupply: params.initialSupply,
          storageMode: 'public',
        });
        if (!faucet) {
          throw new Error('Faucet creation failed');
        }
        onProgress?.(1);
        const result = await mint({
          faucetId: faucet.id().toString(),
          targetAccountId: accountId.toString(),
          amount: params.initialSupply,
          noteType: 'public',
        });
        onProgress?.(2);
        const faucetIdBech32 = accountIdToBech32(faucet.id());
        return { txId: result?.transactionId ?? '', faucetIdBech32 };
      } catch (e) {
        const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Launch failed. Check the console for details.';
        setError(message);
        console.error('Launchpad error:', e);
        return undefined;
      }
    },
    [accountId, createFaucet, mint],
  );

  return useMemo(() => ({
    launchToken,
    error,
    clearError,
  }), [launchToken, error, clearError]);
}
