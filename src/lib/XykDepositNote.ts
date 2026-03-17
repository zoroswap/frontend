import { CustomTransaction } from '@miden-sdk/miden-wallet-adapter';
import {
  AccountId,
  FeltArray,
  FungibleAsset,
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
  TransactionRequestBuilder,
  WebClient,
} from '@miden-sdk/miden-sdk';

import SCRIPT from '@/masm/notes/xyk_deposit.masm?raw';
import { build_lp_local_lib } from './DeployXykPool';
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
  const lp_local_lib = build_lp_local_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(lp_local_lib);
  const script = builder.compileNoteScript(
    SCRIPT,
  );

  const noteTag = NoteTag.withAccountTarget(poolAccountId);

  const attachment = NoteAttachment.newNetworkAccountTarget(
    poolAccountId,
    NoteExecutionHint.always(),
  );

  const metadata = new NoteMetadata(
    userAccountId,
    NoteType.Public,
    noteTag,
  ).withAttachment(attachment);

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

  console.log('Deposit note: ', noteId);

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
