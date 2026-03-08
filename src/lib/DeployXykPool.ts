import {
  AccountId,
  AccountType,
  Felt,
  StorageSlot,
  WebClient,
  Word,
} from '@miden-sdk/miden-sdk';

import c_prod from '@/masm/accounts/c_prod_pool.masm?raw';
import lp_local from '@/masm/accounts/lp_local.masm?raw';
import math from '@/masm/accounts/math.masm?raw';
import storage_utils from '@/masm/accounts/storage_utils.masm?raw';

import { StorageMap } from '@miden-sdk/miden-sdk';
import { AccountComponent } from '@miden-sdk/miden-sdk';
import { AuthSecretKey } from '@miden-sdk/miden-sdk';
import { AccountBuilder } from '@miden-sdk/miden-sdk';
import { AccountStorageMode } from '@miden-sdk/miden-sdk';

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

const build_lp_local_component = (client: WebClient) => {
  const builder = client.createCodeBuilder();
  const math_lib = builder.buildLibrary('zoro::math', math);
  const storage_utils_lib = builder.buildLibrary('zoro::storage_utils', storage_utils);
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils_lib);
  const c_prod_component = builder.buildLibrary('zoro::lp_local', c_prod);
  return c_prod_component;
};
const build_c_prod_component = (client: WebClient) => {
  const builder = client.createCodeBuilder();
  const math_lib = builder.buildLibrary('zoro::math', math);
  const storage_utils_lib = builder.buildLibrary('zoro::storage_utils', storage_utils);
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils_lib);
  const lp_local_component = builder.buildLibrary('zoro::c_prod_pool', lp_local);
  return lp_local_component;
};

export async function deployNewPool({
  client,
  token0,
  token1,
}: DeployNewPoolParams) {
  const lp_local_lib = build_lp_local_component(client);
  const c_prod_lib = build_c_prod_component(client);

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

  const lp_local_component = AccountComponent.fromLibrary(
    lp_local_lib,
    [
      assets_mapping_slot,
      reserve_slot,
      total_supply_slot,
      user_deposits_slot,
    ],
  );

  const c_prod_pool_component = AccountComponent.fromLibrary(c_prod_lib, []);

  const walletSeed = new Uint8Array(32);
  crypto.getRandomValues(walletSeed);

  const secretKey = AuthSecretKey.rpoFalconWithRNG(walletSeed);
  const authComponent = AccountComponent.createAuthComponentFromSecretKey(secretKey);

  const contract = new AccountBuilder(walletSeed)
    .accountType(AccountType.RegularAccountUpdatableCode)
    .storageMode(AccountStorageMode.public())
    .withAuthComponent(authComponent)
    .withComponent(lp_local_component)
    .withComponent(c_prod_pool_component)
    .build();

  await client.addAccountSecretKeyToWebStore(
    contract.account.id(),
    secretKey,
  );
  await client.syncState();

  return {
    newPoolId: contract.account.id(),
  };
}
