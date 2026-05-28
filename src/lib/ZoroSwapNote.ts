import {
  AccountId,
  FungibleAsset,
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

import ZOROSWAP_SCRIPT from '@/masm/notes/ZOROSWAP.masm?raw';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { buildZoroNoteStorage, compileZoroNoteScript } from './compileZoroNoteScript';
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
  const script = await compileZoroNoteScript(client, ZOROSWAP_SCRIPT);
  console.log('Script root: ', script.root().toHex());
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

  const inputs = buildZoroNoteStorage({
    beneficiary: userAccountId,
    deadline,
    p2idTag,
    metadata2: 0n,
    asset: {
      suffix: buyToken.faucetId.suffix(),
      prefix: buyToken.faucetId.prefix(),
      amount: minAmountOut,
    },
    duplicateBeneficiaryInWord2: true,
  });

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
