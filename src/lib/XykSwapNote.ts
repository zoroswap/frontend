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
import { build_xyk_pool_lib } from './DeployXykPool';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface XykSwapParams {
  poolAccountId: AccountId;
  userAccountId: AccountId;
  sellToken: AccountId;
  buyToken: AccountId;
  amount: bigint;
  minAmountOut: bigint;
  client: WebClient;
}

export async function compileXykSwapTransaction({
  poolAccountId,
  userAccountId,
  sellToken,
  buyToken,
  amount,
  minAmountOut,
  client,
}: XykSwapParams) {
  const xyk_pool_lib = build_xyk_pool_lib(client);
  const builder = client.createCodeBuilder();
  builder.linkStaticLibrary(xyk_pool_lib);
  const script = builder.compileNoteScript(SCRIPT);

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

  // Return note: P2ID to user's public account (no network attachment).
  const returnNoteTag = NoteTag.withAccountTarget(userAccountId);
  const returnNoteType = NoteType.Public;
  const returnNoteAssets = new NoteAssets([
    new FungibleAsset(buyToken, BigInt(1)),
  ]);
  const returnNote = Note.createP2IDNote(
    poolAccountId,
    userAccountId,
    returnNoteAssets,
    returnNoteType,
    new NoteAttachment(),
  );
  const p2id_root = returnNote.script().root().toFelts();
  const deadline = Date.now() + 120_000; // 2 min

  const inputs = new NoteInputs(
    new FeltArray([
      new Felt(buyToken.prefix().asInt()),
      new Felt(buyToken.suffix().asInt()),
      new Felt(BigInt(0)),
      new Felt(minAmountOut),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(returnNoteTag.asU32())),
      new Felt(BigInt(NoteType.Public)),
      new Felt(BigInt(0)),
      p2id_root[0],
      p2id_root[1],
      p2id_root[2],
      p2id_root[3],
    ]),
  );

  const noteAssets = new NoteAssets([
    new FungibleAsset(sellToken, amount),
  ]);
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
