import { CustomTransaction } from '@demox-labs/miden-wallet-adapter';
import {
  AccountId,
  FeltArray,
  FungibleAsset,
  MidenArrays,
  Note,
  NoteAssets,
  NoteInputs,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  OutputNote,
  TransactionRequestBuilder,
  WebClient,
} from '@miden-sdk/miden-sdk';

import zoropool from '@/masm/accounts/zoropool.masm?raw';
import DEPOSIT_SCRIPT from '@/masm/notes/xyk_deposit.masm?raw';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface DepositParams {
  token0: AccountId;
  token1: AccountId;
  amount0: bigint;
  amount1: bigint;
  userAccountId: AccountId;
  poolAccountId: AccountId;
  client: WebClient;
}

export interface SwapResult {
  readonly txId: string;
  readonly noteId: string;
}

export async function compileXykDepositTransaction({
  poolAccountId,
  userAccountId,
  token0,
  token1,
  amount0,
  amount1,
  client,
}: DepositParams) {
  const builder = client.createCodeBuilder();
  const pool_script = builder.buildLibrary('zoroswap::zoropool', zoropool);
  builder.linkDynamicLibrary(pool_script);
  const script = builder.compileNoteScript(
    DEPOSIT_SCRIPT,
  );

  // Note should only contain the offered asset
  const noteTag = NoteTag.withAccountTarget(poolAccountId);

  const metadata = new NoteMetadata(
    userAccountId,
    NoteType.Public,
    noteTag,
  );

  const inputs = new NoteInputs(
    new FeltArray([
      userAccountId.prefix(),
      userAccountId.suffix(),
    ]),
  );

  const asset0 = new FungibleAsset(token0, amount0);
  const asset1 = new FungibleAsset(token1, amount1);
  const noteAssets = new NoteAssets([asset0, asset1]);

  const note = new Note(
    noteAssets,
    metadata,
    new NoteRecipient(generateRandomSerialNumber(), script, inputs),
  );

  const noteId = note.id().toString();

  const transactionRequest = new TransactionRequestBuilder()
    .withOwnOutputNotes(new MidenArrays.OutputNoteArray([OutputNote.full(note)]))
    .build();

  const tx = new CustomTransaction(
    accountIdToBech32(userAccountId),
    accountIdToBech32(poolAccountId),
    transactionRequest,
    [],
    [],
  );

  return {
    tx,
    noteId,
    note,
  };
}
