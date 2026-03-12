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

import SCRIPT from '@/masm/notes/xyk_swap_exact_tokens_for_tokens.masm?raw';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface SwapParams {
  token0: AccountId;
  token1: AccountId;
  amount: bigint;
  userAccountId: AccountId;
  poolAccountId: AccountId;
  client: WebClient;
}

export interface SwapResult {
  readonly txId: string;
  readonly noteId: string;
}

export async function compileXykSwapExactTokensForTokensTransaction({
  poolAccountId,
  userAccountId,
  token0,
  token1,
  amount,
  client,
}: SwapParams) {
  const builder = client.createCodeBuilder();
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
  const noteAssets = new NoteAssets([
    new FungibleAsset(token0, BigInt(amount)),
  ]);
  const returnNote = Note.createP2IDNote(
    poolAccountId,
    userAccountId,
    noteAssets,
    returnNoteType,
    new NoteAttachment(),
  );
  const returnNoteRecipientDigest = returnNote.recipient().digest().toFelts();

  const inputs = new NoteInputs(
    new FeltArray([
      token1.prefix(),
      token1.suffix(),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)), // deadline ?????
      new Felt(BigInt(returnNoteTag.asU32())),
      new Felt(BigInt(returnNoteType)),
      new Felt(BigInt(0)),
      returnNoteRecipientDigest[0],
      returnNoteRecipientDigest[1],
      returnNoteRecipientDigest[2],
      returnNoteRecipientDigest[3],
    ]),
  );

  const note = new Note(
    noteAssets,
    metadata,
    new NoteRecipient(generateRandomSerialNumber(), script, inputs),
  );

  const noteId = note.id().toString();

  console.log('Swap note: ', noteId);

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
