import { NETWORK } from '@/lib/config';
import type {
  GetAccountStorageResponse,
  GetFaucetInfoResponse,
  InvalidateCacheResponse,
  SlotQuery,
  SlotResult,
  WorkerOutgoing,
  WorkerRequest,
  WorkerResponse,
} from '@/workers/rpcWorkerTypes';
import { useCallback } from 'react';

type Pending = {
  resolve: (value: WorkerResponse) => void;
  reject: (reason: Error) => void;
};

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
const pending = new Map<number, Pending>();
let nextId = 1;

function getWorker(): { worker: Worker; ready: Promise<void> } {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/rpc.worker.ts', import.meta.url),
      { type: 'module' },
    );

    let resolveReady: () => void;
    readyPromise = new Promise<void>((r) => { resolveReady = r; });

    worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
      const data = e.data;
      if (data.type === 'ready') {
        resolveReady();
        return;
      }
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);

      if (data.type === 'error') {
        p.reject(new Error(data.message));
      } else {
        p.resolve(data);
      }
    };
  }
  return { worker, ready: readyPromise! };
}

async function send<T extends WorkerResponse>(
  request: Omit<WorkerRequest, 'id' | 'rpcEndpoint'>,
): Promise<T> {
  const { worker: w, ready } = getWorker();
  await ready;
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (v: WorkerResponse) => void,
      reject,
    });
    w.postMessage({ ...request, id, rpcEndpoint: NETWORK.rpcEndpoint });
  });
}

// --- Main-thread caches (survive component unmount/remount) ---

const STORAGE_CACHE_TTL = 30_000;

interface StorageCacheEntry {
  results: SlotResult[];
  ts: number;
}

function makeStorageCacheKey(accountBech32: string, queries: SlotQuery[]): string {
  return accountBech32 + '|' + JSON.stringify(queries);
}

const storageCacheMain = new Map<string, StorageCacheEntry>();
const inflightMain = new Map<string, Promise<SlotResult[]>>();

const faucetCacheMain = new Map<string, { symbol: string; decimals: number }>();
const inflightFaucet = new Map<string, Promise<{ symbol: string; decimals: number } | null>>();

export function useRpcWorker() {
  const getAccountStorage = useCallback(
    async (
      accountBech32: string,
      queries: SlotQuery[],
    ): Promise<SlotResult[]> => {
      const key = makeStorageCacheKey(accountBech32, queries);

      const cached = storageCacheMain.get(key);
      if (cached && Date.now() - cached.ts < STORAGE_CACHE_TTL) {
        return cached.results;
      }

      const existing = inflightMain.get(key);
      if (existing) return existing;

      const promise = send<GetAccountStorageResponse>({
        type: 'getAccountStorage',
        accountBech32,
        queries,
      }).then(res => {
        storageCacheMain.set(key, { results: res.results, ts: Date.now() });
        return res.results;
      }).finally(() => inflightMain.delete(key));

      inflightMain.set(key, promise);
      return promise;
    },
    [],
  );

  const getFaucetInfo = useCallback(
    async (
      accountBech32: string,
    ): Promise<{ symbol: string; decimals: number } | null> => {
      const cached = faucetCacheMain.get(accountBech32);
      if (cached) return cached;

      const existing = inflightFaucet.get(accountBech32);
      if (existing) return existing;

      const promise = send<GetFaucetInfoResponse>({
        type: 'getFaucetInfo',
        accountBech32,
      }).then(res => {
        if (res.result) faucetCacheMain.set(accountBech32, res.result);
        return res.result;
      }).finally(() => inflightFaucet.delete(accountBech32));

      inflightFaucet.set(accountBech32, promise);
      return promise;
    },
    [],
  );

  const invalidateCache = useCallback(
    async (accountBech32: string) => {
      // Tell the worker to evict + re-fetch from network (warms worker cache)
      await send<InvalidateCacheResponse>({
        type: 'invalidateCache',
        accountBech32,
      });

      // Now re-fetch every cached query set for this account so main-thread
      // cache gets updated with fresh data instead of being empty.
      const keysToRefresh: { key: string; queries: SlotQuery[] }[] = [];
      for (const [key, entry] of storageCacheMain.entries()) {
        if (key.startsWith(accountBech32 + '|')) {
          const queries: SlotQuery[] = JSON.parse(key.slice(accountBech32.length + 1));
          keysToRefresh.push({ key, queries });
        }
      }

      await Promise.all(
        keysToRefresh.map(async ({ key, queries }) => {
          const res = await send<GetAccountStorageResponse>({
            type: 'getAccountStorage',
            accountBech32,
            queries,
          });
          storageCacheMain.set(key, { results: res.results, ts: Date.now() });
        }),
      );
    },
    [],
  );

  return { getAccountStorage, getFaucetInfo, invalidateCache };
}
