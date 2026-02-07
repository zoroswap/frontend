import {
  type AccountId,
  AccountInterface,
  Address,
  Felt,
  NetworkId,
  WebClient,
  Word,
} from '@miden-sdk/miden-sdk';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NETWORK } from './config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const instantiateClient = async (
  { accountsToImport }: { accountsToImport: (AccountId | undefined)[] },
) => {
  const { Address: DynamicAddress, WebClient } = await import(
    '@miden-sdk/miden-sdk'
  );
  const client = await WebClient.createClient(NETWORK.rpcEndpoint);
  for (const acc of accountsToImport) {
    if (!acc) continue;
    try {
      // Convert to bech32 and back to ensure we have an AccountId from the same module instance
      // toBech32 consumes (destroys) the NetworkId, so we must create a fresh one each call
      const bech32 = acc.toBech32(NetworkId.testnet(), AccountInterface.BasicWallet);
      const accountId = DynamicAddress.fromBech32(bech32).accountId();
      await safeAccountImport(client, accountId);
    } catch (e) {
      console.error(e);
    }
  }
  await client.syncState();
  return client;
};

export const safeAccountImport = async (client: WebClient, accountId: AccountId) => {
  const existingAccount = await client.getAccount(accountId);
  if (existingAccount == null) {
    try {
      await client.importAccountById(accountId);
    } catch (e) {
      console.warn(e);
    }
  }
};

export const accountIdToBech32 = (
  accountId: AccountId,
) => {
  // toBech32 consumes (destroys) the NetworkId, so we must create a fresh one each call
  const networkId = NetworkId.testnet();
  return accountId.toBech32(networkId, AccountInterface.BasicWallet).split('_')[0];
};

export const bech32ToAccountId = (bech32str?: string) => {
  if (bech32str == null) return undefined;
  return Address.fromBech32(bech32str).accountId();
};

export const generateRandomSerialNumber = () => {
  return Word.newFromFelts([
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
  ]);
};
