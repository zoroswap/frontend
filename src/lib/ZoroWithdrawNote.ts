import { CustomTransaction } from '@demox-labs/miden-wallet-adapter';
import {
  AccountId,
  Felt,
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

import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';
import WITHDRAW_SCRIPT from './WITHDRAW.masm?raw';
import zoropool from './zoropool.masm?raw';

export interface WithdrawParams {
  poolAccountId: AccountId;
  token: TokenConfig;
  amount: bigint;
  minAmountOut: bigint;
  userAccountId: AccountId;
  client: WebClient;
  noteType: NoteType;
}

export interface SwapResult {
  readonly txId: string;
  readonly noteId: string;
}

export async function compileWithdrawTransaction({
  poolAccountId,
  token,
  amount,
  minAmountOut,
  userAccountId,
  client,
  noteType,
}: WithdrawParams) {
  const builder = client.createCodeBuilder();
  const pool_script = builder.buildLibrary('zoroswap::zoropool', zoropool);
  builder.linkDynamicLibrary(pool_script);
  const script = builder.compileNoteScript(
    WITHDRAW_SCRIPT,
  );
  const requestedAsset = new FungibleAsset(token.faucetId, minAmountOut).intoWord()
    .toFelts();

  // Note should only contain the offered asset
  const noteAssets = new NoteAssets([]);
  const noteTag = noteType === NoteType.Private
    ? new NoteTag(0)
    : NoteTag.withAccountTarget(poolAccountId);

  const metadata = new NoteMetadata(
    userAccountId,
    noteType,
    noteTag,
  );

  const deadline = Date.now() + 120_000; // 2 min from now

  // Use the AccountId for p2id tag
  const p2idTag = NoteTag.withAccountTarget(userAccountId).asU32();

  // Following the pattern: [asset_id_prefix, asset_id_suffix, 0, min_amount_out]
  const inputs = new NoteInputs(
    new FeltArray([
      ...requestedAsset,
      new Felt(BigInt(0)),
      new Felt(amount),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(p2idTag)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      userAccountId.suffix(),
      userAccountId.prefix(),
    ]),
  );

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
