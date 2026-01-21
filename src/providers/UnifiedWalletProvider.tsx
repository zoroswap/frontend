import { NETWORK } from '@/lib/config';
import {
  AccountId,
  AccountInterface,
  NetworkId,
  TransactionRequest as TxRequest,
} from '@demox-labs/miden-sdk';
import { TransactionType, useWallet } from '@demox-labs/miden-wallet-adapter';
import { useAccount, useLogout } from '@getpara/react-sdk';
import { useParaMiden } from 'miden-para-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ParaClientContext } from './ParaClientContext';
import {
  type TransactionRequest,
  UnifiedWalletContext,
  type WalletType,
} from './UnifiedWalletContext';

interface UnifiedWalletProviderProps {
  readonly children: ReactNode;
}

export function UnifiedWalletProvider({ children }: UnifiedWalletProviderProps) {
  // Miden wallet adapter state
  const midenWallet = useWallet();

  // Para wallet state
  const { isConnected: paraConnected } = useAccount();
  const { logoutAsync } = useLogout();

  // Para-Miden integration via official hook
  const {
    client: paraMidenClient,
    accountId: paraMidenAccountId,
  } = useParaMiden(NETWORK.rpcEndpoint);

  // Local state
  const [walletType, setWalletType] = useState<WalletType>(null);

  // Determine connection state
  const midenConnected = midenWallet.connected;

  // Set wallet type based on connection
  useEffect(() => {
    if (midenConnected && walletType !== 'miden') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWalletType('miden');
    } else if (paraConnected && !midenConnected && walletType !== 'para') {
      setWalletType('para');
    } else if (!midenConnected && !paraConnected && walletType !== null) {
      setWalletType(null);
    }
  }, [midenConnected, paraConnected, walletType]);

  // Request transaction handler
  const requestTransaction = useCallback(
    async (tx: TransactionRequest): Promise<string | undefined> => {
      if (walletType === 'miden') {
        // Delegate to Miden wallet adapter
        if ('type' in tx && tx.type === 'Custom') {
          return midenWallet.requestTransaction?.({
            type: TransactionType.Custom,
            payload: tx.payload,
          });
        }
        return midenWallet.requestTransaction?.(tx);
      } else if (walletType === 'para' && paraMidenClient && paraMidenAccountId) {
        // For Para users, execute transactions via the Miden client
        if ('type' in tx && tx.type === TransactionType.Custom) {
          const customTx = tx.payload as { transactionRequest: string };

          // The transactionRequest is base64 encoded serialized bytes
          const txRequestBytes = Uint8Array.from(
            atob(customTx.transactionRequest),
            c => c.charCodeAt(0),
          );
          const txRequest = TxRequest.deserialize(txRequestBytes);

          // Get the account ID
          const accountId = AccountId.fromHex(paraMidenAccountId);

          // Submit the transaction
          const txHash = await paraMidenClient.submitNewTransaction(accountId, txRequest);

          return txHash.toHex();
        }
        throw new Error('Unsupported transaction type for Para wallet');
      }
      return undefined;
    },
    [walletType, midenWallet, paraMidenClient, paraMidenAccountId],
  );

  // Disconnect handler
  const disconnect = useCallback(async () => {
    if (walletType === 'miden') {
      await midenWallet.disconnect?.();
    } else if (walletType === 'para') {
      await logoutAsync();
    }
    setWalletType(null);
  }, [walletType, midenWallet, logoutAsync]);

  // Convert paraMidenAccountId string to AccountId if available
  const [paraAccountIdObj, setParaAccountIdObj] = useState<AccountId | undefined>();
  useEffect(() => {
    if (paraMidenAccountId && walletType === 'para') {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setParaAccountIdObj(AccountId.fromHex(paraMidenAccountId));
      } catch (e) {
        console.error('Failed to parse Para Miden account ID:', e);
      }
    } else {
      setParaAccountIdObj(undefined);
    }
  }, [paraMidenAccountId, walletType]);

  // Compute Para address from accountId
  const [paraAddress, setParaAddress] = useState<string | null>(null);
  useEffect(() => {
    if (paraAccountIdObj && walletType === 'para') {
      try {
        const networkId = NETWORK.rpcEndpoint.includes('testnet')
          ? NetworkId.Testnet
          : NetworkId.Mainnet;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setParaAddress(
          paraAccountIdObj.toBech32(networkId, AccountInterface.BasicWallet),
        );
      } catch (e) {
        console.error('Failed to convert Para account to address:', e);
      }
    } else {
      setParaAddress(null);
    }
  }, [paraAccountIdObj, walletType]);

  // Compute unified state
  const value = useMemo(() => {
    const connected = walletType === 'miden'
      ? midenConnected
      : walletType === 'para'
      ? paraConnected && !!paraMidenClient && !!paraMidenAccountId
      : false;

    const connecting = walletType === 'miden'
      ? midenWallet.connecting
      : walletType === 'para'
      ? paraConnected && !paraMidenClient
      : false;

    const address = walletType === 'miden'
      ? midenWallet.address ?? null
      : walletType === 'para'
      ? paraAddress
      : null;

    const accountId = walletType === 'para' ? paraAccountIdObj : undefined;

    return {
      connected,
      connecting,
      walletType,
      address,
      accountId,
      requestTransaction,
      disconnect,
    };
  }, [
    walletType,
    midenConnected,
    midenWallet.connecting,
    midenWallet.address,
    paraConnected,
    paraMidenClient,
    paraMidenAccountId,
    paraAddress,
    paraAccountIdObj,
    requestTransaction,
    disconnect,
  ]);

  // Para client for internal use by ZoroProvider (handles locking)
  const paraClientValue = walletType === 'para' ? paraMidenClient ?? undefined : undefined;

  return (
    <UnifiedWalletContext.Provider value={value}>
      <ParaClientContext.Provider value={paraClientValue}>
        {children}
      </ParaClientContext.Provider>
    </UnifiedWalletContext.Provider>
  );
}
