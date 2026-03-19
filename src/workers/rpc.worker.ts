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

const faucetCache = new Map<string, { symbol: string; decimals: number }>();

async function handleMessage(msg: WorkerRequest): Promise<WorkerOutgoing> {
  const client = getClient(msg.rpcEndpoint);

  switch (msg.type) {
    case 'getAccountStorage': {
      const fetched = await client.getAccountDetails(Address.fromBech32(msg.accountBech32).accountId());
      const storage = fetched.account()?.storage();
      const results: SlotResult[] = msg.queries.map((q) => {
        switch (q.kind) {
          case 'item': {
            const value = storage?.getItem(q.slotName);
            return { kind: 'item', value: value ? wordToSerialized(value) : null };
          }
          case 'mapItem': {
            const value = storage?.getMapItem(q.slotName, serializedToWord(q.key));
            return { kind: 'mapItem', value: value ? wordToSerialized(value) : null };
          }
          case 'mapEntries': {
            const entries = storage?.getMapEntries(q.slotName) ?? [];
            return { kind: 'mapEntries', entries: entries.map(e => ({ key: e.key, value: e.value })) };
          }
        }
      });
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
