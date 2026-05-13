import {
  AccountId,
  AccountInterface,
  Address,
  Felt,
  MidenClient,
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
  const client = await MidenClient.create({
    rpcUrl: NETWORK.rpcEndpoint,
    storeName: 'zoro-store',
  });
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
  await client.sync();
  return client;
};

export const safeAccountImport = async (client: MidenClient, accountId: AccountId) => {
  try {
    await client.accounts.getOrImport(accountId);
  } catch (e) {
    console.warn(e);
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

export const generateRandomSerialNumber = () => {
  return Word.newFromFelts([
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
    new Felt(BigInt(Math.floor(Math.random() * 0x1_0000_0000))),
  ]);
};
