import {
  AccountId,
  AccountInterface,
  Address,
  Felt,
  WebClient,
  Word,
} from '@miden-sdk/miden-sdk';

export function accountIdFromPrefixSuffix(
  prefix: Felt,
  suffix: Felt,
): AccountId {
  const prefixHex = prefix.asInt().toString(16).padStart(16, '0');
  const suffixHex = (suffix.asInt() >> 8n).toString(16).padStart(14, '0');
  const accountId = AccountId.fromHex('0x' + prefixHex + suffixHex);

  // const prefixValue = prefix.asInt();
  // const suffixValue = suffix.asInt();
  // const combined = (prefixValue << 64n) | suffixValue;
  // const hex = '0x' + combined.toString(16);
  // const accountId = AccountId.fromHex(hex);
  return accountId;
}
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createNetworkId, NETWORK } from './config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const instantiateClient = async (
  { accountsToImport }: { accountsToImport: (AccountId | undefined)[] },
) => {
  const client = await WebClient.createClient(NETWORK.rpcEndpoint);
  for (const acc of accountsToImport) {
    if (!acc) continue;
    try {
      const bech32 = acc.toBech32(createNetworkId(), AccountInterface.BasicWallet);
      const accountId = Address.fromBech32(bech32).accountId();
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
  return accountId.toBech32(createNetworkId(), AccountInterface.BasicWallet).split(
    '_',
  )[0];
};

export const bech32ToAccountId = (bech32str?: string) => {
  if (bech32str == null) return undefined;
  return Address.fromBech32(bech32str).accountId();
};

/** Parse string (hex or bech32) to AccountId for use with client.importAccountById etc. */
export function parseAccountIdString(str: string | undefined): AccountId | undefined {
  if (str == null || str === '') return undefined;
  const s = str.trim();
  if (s.startsWith('0x') || /^[0-9a-fA-F]+$/.test(s)) {
    return AccountId.fromHex(s.startsWith('0x') ? s : '0x' + s);
  }
  try {
    return Address.fromBech32(s).accountId();
  } catch {
    return undefined;
  }
}

export const generateRandomSerialNumber = () => {
  return Word.newFromFelts([
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
  ]);
};
