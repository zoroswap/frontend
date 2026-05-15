import {
  AccountId,
  Felt,
  FeltArray,
  FungibleAsset,
  Linking,
  MidenClient,
  Note,
  NoteArray,
  NoteAssets,
  NoteMetadata,
  NoteRecipient,
  NoteStorage,
  NoteTag,
  NoteType,
  TransactionRequestBuilder,
} from '@miden-sdk/miden-sdk';
import { CustomTransaction } from '@miden-sdk/miden-wallet-adapter';

import zoropool from '@/masm/accounts/zoropool.masm?raw';
import assetUtils from '@/masm/lib/asset_utils.masm?raw';
import mathUtils from '@/masm/lib/math.masm?raw';
import storageUtils from '@/masm/lib/storage_utils.masm?raw';
import DEPOSIT_SCRIPT from '@/masm/notes/DEPOSIT.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface DepositParams {
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

export async function compileDepositTransaction({
  poolAccountId,
  token,
  amount,
  minAmountOut,
  userAccountId,
  client,
  noteType,
}: DepositParams) {
  const script = await client.compile.noteScript({
    code: DEPOSIT_SCRIPT,
    libraries: [
      {
        namespace: 'zoro_miden::lib::math',
        code: mathUtils,
        linking: Linking.Static,
      },
      {
        namespace: 'zoro_miden::lib::storage_utils',
        code: storageUtils,
        linking: Linking.Static,
      },
      {
        namespace: 'zoro_miden::lib::asset_utils',
        code: assetUtils,
        linking: Linking.Static,
      },
      {
        namespace: 'zoroswap::zoropool',
        code: zoropool,
        linking: Linking.Static,
      },
    ],
  });

  console.log('deposit script root', script.root());

  const offeredAsset = new FungibleAsset(token.faucetId, amount);

  const noteAssets = new NoteAssets([offeredAsset]);
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
      new Felt(minAmountOut),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(p2idTag)),
      new Felt(BigInt(0)),
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
