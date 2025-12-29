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
import { CustomTransaction } from '@demox-labs/miden-wallet-adapter';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

import type { TokenConfig } from '@/providers/ZoroProvider';
import { accountIdToBech32, generateRandomSerialNumber } from './utils';
import ZOROSWAP_SCRIPT from './ZOROSWAP.masm?raw';

import two_asset_pool from './two_asset_pool.masm?raw';

export interface SwapParams {
  poolAccountId: AccountId;
  sellToken: TokenConfig;
  buyToken: TokenConfig;
  amount: bigint;
  minAmountOut: bigint;
  userAccountId: AccountId;
  client: WebClient;
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
}: SwapParams) {
  console.log(buyToken, sellToken);

  await client.syncState();
  const builder = client.createScriptBuilder();
  const pool_script = builder.buildLibrary('zoro::two_asset_pool', two_asset_pool);
  builder.linkDynamicLibrary(pool_script);
  const script = builder.compileNoteScript(ZOROSWAP_SCRIPT);
  const noteType = NoteType.Public;
  const offeredAsset = new FungibleAsset(sellToken.faucetId, amount);

  // Note should only contain the offered asset
  const noteAssets = new NoteAssets([offeredAsset]);
  const noteTag = NoteTag.fromAccountId(poolAccountId);

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
      new Felt(minAmountOut),
      new Felt(BigInt(0)),
      buyToken.faucetId.suffix(),
      buyToken.faucetId.prefix(),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(p2idTag)),
      new Felt(BigInt(0)),
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
  };
}
