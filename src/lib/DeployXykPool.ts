import {
  AccountId,
  AccountType,
  Felt,
  FeltArray,
  MidenArrays,
  Note,
  NoteAssets,
  NoteAttachment,
  NoteExecutionHint,
  NoteInputs,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  OutputNote,
  StorageSlot,
  TransactionRequestBuilder,
  WebClient,
  Word,
} from '@miden-sdk/miden-sdk';

import lp_local from '@/masm/accounts/lp_local.masm?raw';
import math from '@/masm/accounts/math.masm?raw';
import storage_utils from '@/masm/accounts/storage_utils.masm?raw';
import xyk_pool from '@/masm/accounts/xyk_pool.masm?raw';
import xyk_registry from '@/masm/accounts/xyk_registry.masm?raw';
import XYK_REGISTER_SCRIPT from '@/masm/notes/xyk_register.masm?raw';
import network_account_masm from '@/masm/vendor/network_account_target.masm?raw';

import type { TransactionRequest } from '@/providers/UnifiedWalletContext';
import { CustomTransaction, TransactionType } from '@demox-labs/miden-wallet-adapter';
import { StorageMap } from '@miden-sdk/miden-sdk';
import { AccountComponent } from '@miden-sdk/miden-sdk';
import { AccountBuilder } from '@miden-sdk/miden-sdk';
import { AccountStorageMode } from '@miden-sdk/miden-sdk';
import { REGISTRY_ACCOUNT } from './config';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

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
export const build_network_account_lib = (client: WebClient) => {
  const builder = client.createCodeBuilder();
  return builder.buildLibrary(
    'biden::standards::attachments::network_account_target',
    network_account_masm,
  );
};

export const build_lp_local_lib = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const storage_utils = build_storage_utils(client);
  // const network_account_lib = build_network_account_lib(client);
  const builder = client.createCodeBuilder();
  // builder.linkStaticLibrary(network_account_lib);
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils);
  return builder.buildLibrary('zoro::lp_local', lp_local);
};
export const build_xyk_pool_lib = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const storage_utils = build_storage_utils(client);
  const lp_local = build_lp_local_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils);
  builder.linkStaticLibrary(lp_local);
  return builder.buildLibrary('zoro::xyk_pool', xyk_pool);
};
export const build_registry_library = (client: WebClient) => {
  const math_lib = build_math_lib(client);
  const storage_utils = build_storage_utils(client);
  const lp_local = build_lp_local_lib(client);
  const xyk_pool = build_xyk_pool_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(math_lib);
  builder.linkStaticLibrary(storage_utils);
  builder.linkStaticLibrary(lp_local);
  builder.linkStaticLibrary(xyk_pool);
  return builder.buildLibrary('zoro::registry', xyk_registry);
};

export const compile_xyk_register_note_script = (client: WebClient) => {
  const xyk_registry = build_registry_library(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(xyk_registry);
  const script = builder.compileNoteScript(
    XYK_REGISTER_SCRIPT,
  );
  return script;
};

export const get_register_note_root_hash = (client: WebClient) => {
  const note_script = compile_xyk_register_note_script(client);
  return note_script.root();
};

export const get_pool_account_code_commitment = async (client: WebClient) => {
  if (REGISTRY_ACCOUNT == null) {
    throw 'REGISTRY_ACCOUNT needs to be available in .env';
  }
  const pool = await buildXykPool({
    client,
    token0: REGISTRY_ACCOUNT,
    token1: REGISTRY_ACCOUNT,
  });
  return pool.account.code().commitment();
};

const buildXykPool = async ({
  client,
  token0,
  token1,
}: DeployNewPoolParams) => {
  if (REGISTRY_ACCOUNT == null) {
    throw 'REGISTRY_ACCOUNT needs to be available in .env';
  }
  const lp_local_lib = build_lp_local_lib(client);
  const xyk_pool_lib = build_xyk_pool_lib(client);

  const assets = new StorageMap();
  assets.insert(
    Word.newFromFelts([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
    ]),
    Word.newFromFelts([
      token0.suffix(),
      token0.prefix(),
      token1.suffix(),
      token1.prefix(),
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

  const registry_id_slot = StorageSlot.fromValue(
    'zoro::lp_local::registry_id',
    Word.newFromFelts([
      REGISTRY_ACCOUNT.suffix(),
      REGISTRY_ACCOUNT.prefix(),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
    ]),
  );

  const register_note_root = StorageSlot.fromValue(
    'zoro::lp_local::register_note_root',
    get_register_note_root_hash(client),
  );

  const xyk_pool_component = AccountComponent.fromLibrary(xyk_pool_lib, [])
    .withSupportsAllTypes();

  const lp_local_component = AccountComponent.fromLibrary(
    lp_local_lib,
    [
      assets_mapping_slot,
      reserve_slot,
      total_supply_slot,
      user_deposits_slot,
      registry_id_slot,
      register_note_root,
    ],
  ).withSupportsAllTypes();

  const walletSeed = new Uint8Array(32);
  crypto.getRandomValues(walletSeed);

  const contract = new AccountBuilder(walletSeed)
    .accountType(AccountType.RegularAccountImmutableCode)
    .storageMode(AccountStorageMode.network())
    // .storageMode(AccountStorageMode.public())
    .withComponent(lp_local_component)
    .withComponent(xyk_pool_component)
    .withNoAuthComponent()
    // .withAuthComponent(authComponent)
    .withBasicWalletComponent()
    .build();

  return contract;
};

export async function deployNewPool({
  client,
  token0,
  token1,
}: DeployNewPoolParams) {
  const contract = await buildXykPool({ client, token0, token1 });
  await client.newAccount(contract.account, true);
  await client.syncState();
  console.log('Deployed new XYK pool at: ', accountIdToBech32(contract.account.id()));
  console.log('???');
  const initTx = new TransactionRequestBuilder()
    .build();
  await client.submitNewTransaction(contract.account.id(), initTx);
  await client.syncState();
  client.syncState();

  return {
    newPoolId: contract.account.id(),
  };
}

export const registerPool = async ({
  client,
  token0,
  token1,
  pool_acc,
  sender,
  requestTransaction,
}: DeployNewPoolParams & {
  pool_acc: AccountId;
  sender: AccountId;
  requestTransaction: (tx: TransactionRequest) => void;
}) => {
  if (!REGISTRY_ACCOUNT) return;

  await client.importAccountById(REGISTRY_ACCOUNT);
  await client.importAccountById(pool_acc);
  await client.syncState();

  const script = compile_xyk_register_note_script(client);
  const noteTag = NoteTag.withAccountTarget(REGISTRY_ACCOUNT);
  const attachment = NoteAttachment.newNetworkAccountTarget(
    REGISTRY_ACCOUNT,
    NoteExecutionHint.always(),
  );
  const metadata = new NoteMetadata(
    sender,
    NoteType.Public,
    noteTag,
  ).withAttachment(attachment);

  const inputs = new NoteInputs(
    new FeltArray([
      token0.prefix(),
      token0.suffix(),
      token1.prefix(),
      token1.suffix(),
      pool_acc.prefix(),
      pool_acc.suffix(),
      REGISTRY_ACCOUNT.prefix(),
      REGISTRY_ACCOUNT.suffix(),
    ]),
  );

  const noteAssets = new NoteAssets([]);
  const note = new Note(
    noteAssets,
    metadata,
    new NoteRecipient(generateRandomSerialNumber(), script, inputs),
  );

  const noteId = note.id().toString();

  console.log('REGISTRY note: ', noteId, note);

  const transactionRequest = new TransactionRequestBuilder()
    .withOwnOutputNotes(new MidenArrays.OutputNoteArray([OutputNote.full(note)]))
    .build();

  const tx = new CustomTransaction(
    accountIdToBech32(sender),
    accountIdToBech32(REGISTRY_ACCOUNT),
    transactionRequest,
    [],
    [],
  );

  requestTransaction({
    type: TransactionType.Custom,
    payload: tx,
  });
};
