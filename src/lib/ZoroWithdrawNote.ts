import {
  AccountId,
  Felt,
  FeltArray,
  FungibleAsset,
  MidenArrays,
  Note,
  NoteAssets,
  NoteExecutionHint,
  NoteInputs,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  OutputNote,
  TransactionRequestBuilder,
  WebClient,
} from '@demox-labs/miden-sdk';
import { Transaction } from '@demox-labs/miden-wallet-adapter';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

import type { TokenConfig } from '@/providers/ZoroProvider';
import two_asset_pool from './two_asset_pool.masm?raw';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';
import WITHDRAW_SCRIPT from './WITHDRAW.masm?raw';

export interface WithdrawParams {
  poolAccountId: AccountId;
  token: TokenConfig;
  amount: bigint;
  minAmountOut: bigint;
  userAccountId: AccountId;
  client: WebClient;
  syncState: () => Promise<void>;
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
  syncState,
  noteType,
}: WithdrawParams) {
  await syncState();
  const builder = client.createScriptBuilder();
  const pool_script = builder.buildLibrary('zoro::two_asset_pool', two_asset_pool);
  builder.linkDynamicLibrary(pool_script);
  const script = builder.compileNoteScript(
    WITHDRAW_SCRIPT,
  );
  const requestedAsset = new FungibleAsset(token.faucetId, amount).intoWord().toFelts();

  // Note should only contain the offered asset
  const noteAssets = new NoteAssets([]);
  const noteTag = noteType === NoteType.Private
    ? NoteTag.forLocalUseCase(0, 0)
    : NoteTag.fromAccountId(poolAccountId);

  const metadata = new NoteMetadata(
    userAccountId,
    noteType,
    noteTag,
    NoteExecutionHint.always(),
    new Felt(BigInt(0)), // aux
  );

  const deadline = Date.now() + 120_000; // 2 min from now

  // Use the AccountId for p2id tag
  const p2idTag = NoteTag.fromAccountId(userAccountId).asU32();

  // Following the pattern: [asset_id_prefix, asset_id_suffix, 0, min_amount_out]
  const inputs = new NoteInputs(
    new FeltArray([
      ...requestedAsset,
      new Felt(BigInt(0)),
      new Felt(minAmountOut),
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

  const tx = Transaction.createCustomTransaction(
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
