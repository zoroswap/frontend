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
import ZOROSWAP_SCRIPT from '@/masm/notes/ZOROSWAP.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';

export interface SwapParams {
  poolAccountId: AccountId;
  sellToken: TokenConfig;
  buyToken: TokenConfig;
  amount: bigint;
  minAmountOut: bigint;
  userAccountId: AccountId;
  client: MidenClient;
}

export interface SwapResult {
  readonly txId: string;
  readonly noteId: string;
}

export async function compileSwapTransaction({
  poolAccountId,
  buyToken,
  sellToken,
  amount,
  minAmountOut,
  userAccountId,
  client,
}: Omit<SwapParams, 'syncState'>) {
  const script = await client.compile.noteScript({
    code: ZOROSWAP_SCRIPT,
    libraries: [{
      namespace: 'zoroswap::zoropool',
      code: zoropool,
      linking: Linking.Dynamic,
    }],
  });
  const noteType = NoteType.Public;
  const offeredAsset = new FungibleAsset(sellToken.faucetId, amount);

  const noteAssets = new NoteAssets([offeredAsset]);
  const noteTag = NoteTag.withAccountTarget(poolAccountId);

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
      new Felt(BigInt(0)),
      buyToken.faucetId.suffix(),
      buyToken.faucetId.prefix(),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(p2idTag)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      userAccountId.suffix(),
      userAccountId.prefix(),
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

  console.log('Swap note: ', noteId);

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
  };
}
