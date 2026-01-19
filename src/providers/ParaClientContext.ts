import type { WebClient } from '@demox-labs/miden-sdk';
import { createContext, useContext } from 'react';

/**
 * Internal context for Para wallet's Miden client.
 *
 * This is intentionally separate from `UnifiedWalletContext` to keep
 * the client access internal to `ZoroProvider` (which handles all
 * locking and synchronization).
 *
 * Consumers should not use this context directly! Instead, use
 * the `ZoroContext` methods (`syncState`, `getAccount`, `getBalance`, etc.).
 * Those handle locking properly using a mutex.
 */
export const ParaClientContext = createContext<WebClient | undefined>(undefined);

/**
 * Internal hook for `ZoroProvider` to access the Para client.
 * Not exported from the module's public API.
 */
export function useParaClient(): WebClient | undefined {
  return useContext(ParaClientContext);
}
