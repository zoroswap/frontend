import {
  AccountId,
  AccountType,
  Felt,
  StorageSlot,
  TransactionRequestBuilder,
  WebClient,
  Word,
} from '@miden-sdk/miden-sdk';

import lp_local from '@/masm/accounts/lp_local.masm?raw';
import math from '@/masm/accounts/math.masm?raw';
import storage_utils from '@/masm/accounts/storage_utils.masm?raw';
import xyk_pool from '@/masm/accounts/xyk_pool.masm?raw';

import { StorageMap } from '@miden-sdk/miden-sdk';
import { AccountComponent } from '@miden-sdk/miden-sdk';
import { AuthSecretKey } from '@miden-sdk/miden-sdk';
import { AccountBuilder } from '@miden-sdk/miden-sdk';
import { AccountStorageMode } from '@miden-sdk/miden-sdk';
import { accountIdToBech32 } from './utils';

export interface DeployNewPoolParams {
  token0: AccountId;
  token1: AccountId;
  client: WebClient;
}

export interface DeployResult {
  txId: string;
  noteId: string;
  newPool: AccountId;
}

export const build_math_lib = (client: WebClient) => {
  const builder = client.createCodeBuilder();
  return builder.buildLibrary('zoro::math', math);
};
export const build_storage_utils = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(math_lib);
  return builder.buildLibrary('zoro::storage_utils', storage_utils);
};

export const build_lp_local_lib = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const storage_utils = build_storage_utils(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils);
  return builder.buildLibrary('zoro::lp_local', lp_local);
};
export const build_xyk_pool_lib = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const lp_local = build_lp_local_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(lp_local);
  return builder.buildLibrary('zoro::xyk_pool', xyk_pool);
};

export async function deployNewPool({
  client,
  token0,
  token1,
}: DeployNewPoolParams) {
  const assets = new StorageMap();
  assets.insert(
    Word.newFromFelts([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
    ]),
    Word.newFromFelts([
      token1.suffix(),
      token1.prefix(),
      token0.suffix(),
      token0.prefix(),
    ]),
  );

  const assets_mapping_slot = StorageSlot.map('zoro::lp_local::assets_mapping', assets);
  const reserve_slot = StorageSlot.emptyValue('zoro::lp_local::reserve');
  const total_supply_slot = StorageSlot.emptyValue('zoro::lp_local::total_supply');
  const user_deposits_mapping = new StorageMap();
  user_deposits_mapping.insert(
    Word.newFromFelts([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(1)),
    ]),
    Word.newFromFelts([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(1)),
    ]),
  );
  const user_deposits_slot = StorageSlot.map(
    'zoro::lp_local::user_deposits_mapping',
    user_deposits_mapping,
  );

  console.log('lp local build');
  const lp_local_lib = build_lp_local_lib(client);
  // console.log('c prod build');
  const xyk_pool_lib = build_xyk_pool_lib(client);

  const xyk_pool_component = AccountComponent.fromLibrary(xyk_pool_lib, [])
    .withSupportsAllTypes();

  const lp_local_component = AccountComponent.fromLibrary(
    lp_local_lib,
    [
      assets_mapping_slot,
      reserve_slot,
      total_supply_slot,
      user_deposits_slot,
    ],
  ).withSupportsAllTypes();

  console.log('account built');

  const walletSeed = new Uint8Array(32);
  crypto.getRandomValues(walletSeed);
  const secretKey = AuthSecretKey.rpoFalconWithRNG(walletSeed);
  // const authComponent = AccountComponent.createAuthComponentFromSecretKey(secretKey);

  const contract = new AccountBuilder(walletSeed)
    .accountType(AccountType.RegularAccountImmutableCode)
    .storageMode(AccountStorageMode.network())
    // .storageMode(AccountStorageMode.public())
    .withNoAuthComponent()
    .withComponent(lp_local_component)
    // .withAuthComponent(authComponent)
    .withComponent(xyk_pool_component)
    .withBasicWalletComponent()
    .build();

  await client.addAccountSecretKeyToWebStore(
    contract.account.id(),
    secretKey,
  );

  await client.newAccount(contract.account, true);

  await client.syncState();
  console.log('Deployed new XYK pool at: ', accountIdToBech32(contract.account.id()));

  const initTx = new TransactionRequestBuilder()
    .build();
  await client.submitNewTransaction(contract.account.id(), initTx);
  await client.syncState();

  return {
    newPoolId: contract.account.id(),
  };
}
