import {
  Address,
  BasicFungibleFaucetComponent,
  Endpoint,
  Felt,
  RpcClient,
  Word,
} from '@miden-sdk/miden-sdk';
import type {
  RpcReady,
  SerializedWord,
  SlotResult,
  WorkerOutgoing,
  WorkerRequest,
} from './rpcWorkerTypes';

let rpcClient: RpcClient | null = null;
let currentEndpoint = '';

function getClient(rpcEndpoint: string): RpcClient {
  if (!rpcClient || currentEndpoint !== rpcEndpoint) {
    rpcClient = new RpcClient(new Endpoint(rpcEndpoint));
    currentEndpoint = rpcEndpoint;
  }
  return rpcClient;
}

function wordToSerialized(w: Word): SerializedWord {
  const f = w.toFelts();
  return [f[0].asInt().toString(), f[1].asInt().toString(), f[2].asInt().toString(), f[3].asInt().toString()];
}

function serializedToWord(s: SerializedWord): Word {
  return Word.newFromFelts([new Felt(BigInt(s[0])), new Felt(BigInt(s[1])), new Felt(BigInt(s[2])), new Felt(BigInt(s[3]))]);
}

// --- Caches ---

const faucetCache = new Map<string, { symbol: string; decimals: number }>();

const STORAGE_TTL_MS = 30_000;
type AccountStorageObj = ReturnType<
  NonNullable<ReturnType<Awaited<ReturnType<RpcClient['getAccountDetails']>>['account']>>['storage']
>;
interface StorageCacheEntry {
  storage: AccountStorageObj | undefined;
  ts: number;
}
const storageCache = new Map<string, StorageCacheEntry>();

// Dedup: if a fetch for the same account is already in-flight, reuse its promise
const inflightStorage = new Map<string, Promise<AccountStorageObj | undefined>>();

async function fetchAccountStorage(client: RpcClient, bech32: string): Promise<AccountStorageObj | undefined> {
  const cached = storageCache.get(bech32);
  if (cached && Date.now() - cached.ts < STORAGE_TTL_MS) {
    return cached.storage;
  }

  const existing = inflightStorage.get(bech32);
  if (existing) return existing;

  const promise = client.getAccountDetails(Address.fromBech32(bech32).accountId())
    .then(f => {
      const storage = f.account()?.storage();
      storageCache.set(bech32, { storage, ts: Date.now() });
      return storage;
    })
    .finally(() => inflightStorage.delete(bech32));

  inflightStorage.set(bech32, promise);
  return promise;
}

function readSlots(storage: AccountStorageObj | undefined, queries: WorkerRequest extends { queries: infer Q } ? Q : never): SlotResult[] {
  return (queries as import('./rpcWorkerTypes').SlotQuery[]).map((q) => {
    switch (q.kind) {
      case 'item': {
        const value = storage?.getItem(q.slotName);
        return { kind: 'item' as const, value: value ? wordToSerialized(value) : null };
      }
      case 'mapItem': {
        const value = storage?.getMapItem(q.slotName, serializedToWord(q.key));
        return { kind: 'mapItem' as const, value: value ? wordToSerialized(value) : null };
      }
      case 'mapEntries': {
        const entries = storage?.getMapEntries(q.slotName) ?? [];
        return { kind: 'mapEntries' as const, entries: entries.map(e => ({ key: e.key, value: e.value })) };
      }
    }
  });
}

async function handleMessage(msg: WorkerRequest): Promise<WorkerOutgoing> {
  const client = getClient(msg.rpcEndpoint);

  switch (msg.type) {
    case 'getAccountStorage': {
      const storage = await fetchAccountStorage(client, msg.accountBech32);
      const results = readSlots(storage, msg.queries);
      return { type: 'getAccountStorage', id: msg.id, results };
    }
    case 'getFaucetInfo': {
      const cached = faucetCache.get(msg.accountBech32);
      if (cached) {
        return { type: 'getFaucetInfo', id: msg.id, result: cached };
      }
      const fetched = await client.getAccountDetails(Address.fromBech32(msg.accountBech32).accountId());
      const account = fetched.account();
      if (!account) {
        return { type: 'getFaucetInfo', id: msg.id, result: null };
      }
      const faucet = BasicFungibleFaucetComponent.fromAccount(account);
      const info = { symbol: faucet.symbol().toString(), decimals: faucet.decimals() };
      faucetCache.set(msg.accountBech32, info);
      return { type: 'getFaucetInfo', id: msg.id, result: info };
    }
    case 'invalidateCache': {
      storageCache.delete(msg.accountBech32);
      inflightStorage.delete(msg.accountBech32);
      // Re-fetch from network so the worker cache is warm again
      await fetchAccountStorage(client, msg.accountBech32);
      return { type: 'invalidateCache', id: msg.id };
    }
    default:
      return { type: 'error', id: msg.id, message: `Unknown request type: ${(msg as { type: string }).type}` };
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  handleMessage(e.data).then(
    (response) => self.postMessage(response),
    (err) => self.postMessage({
      type: 'error',
      id: e.data.id,
      message: err instanceof Error ? err.message : String(err),
    }),
  );
};

self.postMessage({ type: 'ready' } satisfies RpcReady);
