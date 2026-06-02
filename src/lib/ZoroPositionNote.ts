import {
  AccountId,
  FungibleAsset,
  MidenClient,
  Note,
  NoteAndArgs,
  NoteAndArgsArray,
  NoteArray,
  NoteAssets,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  TransactionRequestBuilder,
} from '@miden-sdk/miden-sdk';
import { CustomTransaction } from '@miden-sdk/miden-wallet-adapter';

import POSITION_SCRIPT from '@/masm/notes/POSITION.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { buildZoroNoteStorage, compilePositionNoteScript } from './compileZoroNoteScript';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface PositionAssetInput {
  token: TokenConfig;
  amount: bigint;
}

export interface OpenPositionParams {
  poolAccountId: AccountId;
  userAccountId: AccountId;
  assets: PositionAssetInput[];
  client: MidenClient;
}

export function serializeNoteToBase64(note: Note): string {
  return btoa(
    String.fromCharCode.apply(null, note.serialize() as unknown as number[]),
  );
}

export async function compileOpenPositionTransaction({
  poolAccountId,
  userAccountId,
  assets,
  client,
}: OpenPositionParams) {
  if (assets.length === 0) {
    throw new Error('At least one asset is required to open a position');
  }

  const script = await compilePositionNoteScript(client, POSITION_SCRIPT);

  const offeredAssets = assets.map(
    ({ token, amount }) => new FungibleAsset(token.faucetId, amount),
  );
  const noteAssets = new NoteAssets(offeredAssets);
  const noteTag = NoteTag.withAccountTarget(userAccountId);

  const metadata = new NoteMetadata(
    userAccountId,
    NoteType.Public,
    noteTag,
  );

  const deadline = Date.now() + 999_999_999_999;
  const p2idTag = NoteTag.withAccountTarget(userAccountId).asU32();

  const inputs = buildZoroNoteStorage({
    beneficiary: userAccountId,
    deadline,
    p2idTag,
    metadata2: BigInt(0),
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

  console.log('note tag:', note.metadata().tag());

  return {
    tx,
    noteId,
    note,
  };
}

export function compileReclaimPositionTransaction(
  userAccountId: AccountId,
  note: Note,
): CustomTransaction {
  const request = new TransactionRequestBuilder()
    .withInputNotes(new NoteAndArgsArray([new NoteAndArgs(note, null)]))
    .build();

  const userBech32 = accountIdToBech32(userAccountId);
  return new CustomTransaction(
    userBech32,
    userBech32,
    request,
    [],
    [new Uint8Array(note.serialize() as unknown as ArrayLike<number>)],
  );
}
