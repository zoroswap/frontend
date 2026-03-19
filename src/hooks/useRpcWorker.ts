import { NETWORK } from '@/lib/config';
import type {
  GetAccountStorageResponse,
  GetFaucetInfoResponse,
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

export function useRpcWorker() {
  const getAccountStorage = useCallback(
    async (
      accountBech32: string,
      queries: SlotQuery[],
    ): Promise<SlotResult[]> => {
      const res = await send<GetAccountStorageResponse>({
        type: 'getAccountStorage',
        accountBech32,
        queries,
      });
      return res.results;
    },
    [],
  );

  const getFaucetInfo = useCallback(
    async (
      accountBech32: string,
    ): Promise<{ symbol: string; decimals: number } | null> => {
      const res = await send<GetFaucetInfoResponse>({
        type: 'getFaucetInfo',
        accountBech32,
      });
      return res.result;
    },
    [],
  );

  return { getAccountStorage, getFaucetInfo };
}
