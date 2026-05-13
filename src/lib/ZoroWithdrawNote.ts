import { CustomTransaction } from '@miden-sdk/miden-wallet-adapter';
import {
  AccountId,
  Felt,
  FeltArray,
  FungibleAsset,
  Linking,
  MidenClient,
  NoteArray,
  Note,
  NoteAssets,
  NoteStorage,
  NoteMetadata,
  NoteRecipient,
  NoteTag,
  NoteType,
  TransactionRequestBuilder,
} from '@miden-sdk/miden-sdk';

import zoropool from '@/masm/accounts/zoropool.masm?raw';
import WITHDRAW_SCRIPT from '@/masm/notes/WITHDRAW.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
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
  const script = await client.compile.noteScript({
    code: WITHDRAW_SCRIPT,
    libraries: [{
      namespace: 'zoroswap::zoropool',
      code: zoropool,
      linking: Linking.Dynamic,
    }],
  });
  const requestedAsset = new FungibleAsset(token.faucetId, minAmountOut).intoWord()
    .toFelts();

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

  const inputs = new NoteStorage(
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
