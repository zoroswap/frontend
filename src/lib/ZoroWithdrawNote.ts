import {
  AccountId,
  MidenClient,
  Note,
  NoteArray,
  NoteAssets,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  TransactionRequestBuilder,
} from '@miden-sdk/miden-sdk';
import { CustomTransaction } from '@miden-sdk/miden-wallet-adapter';

import WITHDRAW_SCRIPT from '@/masm/notes/WITHDRAW.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { buildZoroNoteStorage, compileZoroNoteScript } from './compileZoroNoteScript';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface WithdrawParams {
  poolAccountId: AccountId;
  token: TokenConfig;
  amount: bigint;
  minAmountOut: bigint;
  userAccountId: AccountId;
  client: MidenClient;
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
  const script = await compileZoroNoteScript(client, WITHDRAW_SCRIPT);

  const noteAssets = new NoteAssets([]);
  const noteTag = noteType === NoteType.Private
    ? new NoteTag(0)
    : NoteTag.withAccountTarget(poolAccountId);

  const metadata = new NoteMetadata(
    userAccountId,
    noteType,
    noteTag,
  );

  const deadline = Date.now() + 120_000;

  const p2idTag = NoteTag.withAccountTarget(userAccountId).asU32();

  const inputs = buildZoroNoteStorage({
    beneficiary: userAccountId,
    deadline,
    p2idTag,
    metadata2: amount,
    asset: {
      suffix: token.faucetId.suffix(),
      prefix: token.faucetId.prefix(),
      amount: minAmountOut,
    },
  });

  const note = new Note(
    noteAssets,
    metadata,
    new NoteRecipient(generateRandomSerialNumber(), script, inputs),
  );

  const noteId = note.id().toString();

  const transactionRequest = new TransactionRequestBuilder()
    .withOwnOutputNotes(new NoteArray([note]))
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
