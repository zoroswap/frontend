import { CustomTransaction } from '@demox-labs/miden-wallet-adapter';
import {
  AccountId,
  Felt,
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

import SCRIPT from '@/masm/notes/xyk_withdraw.masm?raw';
import { build_lp_local_lib } from './DeployXykPool';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface WithdrawParams {
  token0: AccountId;
  token1: AccountId;
  lpAmount: bigint;
  userAccountId: AccountId;
  poolAccountId: AccountId;
  client: WebClient;
}

export interface SwapResult {
  readonly txId: string;
  readonly noteId: string;
}

export async function compileXykWithdrawTransaction({
  poolAccountId,
  userAccountId,
  token0,
  token1,
  lpAmount,
  client,
}: WithdrawParams) {
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

  const returnNoteTag = NoteTag.withAccountTarget(userAccountId);
  const returnNoteType = NoteType.Public;
  const returnNoteAssets = new NoteAssets([
    new FungibleAsset(token0, BigInt(1)),
    new FungibleAsset(token1, BigInt(1)),
  ]);
  const returnNote = Note.createP2IDNote(
    poolAccountId,
    userAccountId,
    returnNoteAssets,
    returnNoteType,
    new NoteAttachment(),
  );
  const root = returnNote.script().root().toFelts();

  const inputs = new NoteInputs(
    new FeltArray([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(lpAmount),
      new Felt(BigInt(returnNoteTag.asU32())),
      new Felt(BigInt(NoteType.Public)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      root[0],
      root[1],
      root[2],
      root[3],
    ]),
  );

  const noteAssets = new NoteAssets([]);
  const note = new Note(
    noteAssets,
    metadata,
    new NoteRecipient(generateRandomSerialNumber(), script, inputs),
  );

  const noteId = note.id().toString();

  console.log('Withdraw note: ', noteId);

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
    returnNote,
  };
}
