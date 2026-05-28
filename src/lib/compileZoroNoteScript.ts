import {
  AccountId,
  Felt,
  FeltArray,
  MidenClient,
  NoteScript,
  NoteStorage,
} from '@miden-sdk/miden-sdk';

import zoropool from '@/masm/accounts/zoropool.masm?raw';
import assetUtils from '@/masm/lib/asset_utils.masm?raw';
import mathUtils from '@/masm/lib/math.masm?raw';
import outputNoteUtils from '@/masm/lib/output_note_utils.masm?raw';
import storageUtils from '@/masm/lib/storage_utils.masm?raw';
import noteCommon from '@/masm/notes/lib/common.masm?raw';

type InnerWebClient = {
  createCodeBuilder: () => {
    linkModule: (namespace: string, code: string) => void;
    compileNoteScript: (code: string) => Promise<NoteScript>;
  };
};

type ClientWithInner = MidenClient & {
  _withInnerWebClient: <T>(fn: (inner: InnerWebClient) => Promise<T>) => Promise<T>;
};

export interface ZoroNoteStorageParams {
  beneficiary: AccountId;
  deadline: number;
  p2idTag: number;
  metadata2: bigint;
  asset?: {
    suffix: Felt;
    prefix: Felt;
    amount: bigint;
  };
  duplicateBeneficiaryInWord2?: boolean;
}

export function buildZoroNoteStorage({
  beneficiary,
  deadline,
  p2idTag,
  metadata2,
  asset,
  duplicateBeneficiaryInWord2 = false,
}: ZoroNoteStorageParams): NoteStorage {
  return new NoteStorage(
    new FeltArray([
      asset?.suffix ?? new Felt(0n),
      asset?.prefix ?? new Felt(0n),
      new Felt(0n),
      asset ? new Felt(asset.amount) : new Felt(0n),
      new Felt(BigInt(deadline)),
      new Felt(BigInt(p2idTag)),
      new Felt(metadata2),
      new Felt(0n),
      beneficiary.suffix(),
      beneficiary.prefix(),
      duplicateBeneficiaryInWord2 ? beneficiary.suffix() : new Felt(0n),
      duplicateBeneficiaryInWord2 ? beneficiary.prefix() : new Felt(0n),
    ]),
  );
}

export async function compileZoroNoteScript(
  client: MidenClient,
  noteScript: string,
): Promise<NoteScript> {
  return (client as ClientWithInner)._withInnerWebClient(async (inner) => {
    const builder = inner.createCodeBuilder();
    builder.linkModule('zoro_miden::lib::math', mathUtils);
    builder.linkModule('zoro_miden::lib::storage_utils', storageUtils);
    builder.linkModule('zoro_miden::lib::asset_utils', assetUtils);
    builder.linkModule('zoro_miden::note::common', noteCommon);
    builder.linkModule('zoro_miden::lib::output_note_utils', outputNoteUtils);
    builder.linkModule('zoroswap::zoropool', zoropool);
    return builder.compileNoteScript(noteScript);
  });
}
