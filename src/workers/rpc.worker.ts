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

function getAccountStorage(client: RpcClient, bech32: string) {
  return client.getAccountDetails(Address.fromBech32(bech32).accountId())
    .then(f => f.account()?.storage());
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  let response: WorkerOutgoing;

  try {
    const client = getClient(msg.rpcEndpoint);

    switch (msg.type) {
      case 'getStorageMapItem': {
        const storage = await getAccountStorage(client, msg.accountBech32);
        const value = storage?.getMapItem(msg.slotName, serializedToWord(msg.key));
        response = { type: 'getStorageMapItem', id: msg.id, result: value ? wordToSerialized(value) : null };
        break;
      }
      case 'getStorageItem': {
        const storage = await getAccountStorage(client, msg.accountBech32);
        const value = storage?.getItem(msg.slotName);
        response = { type: 'getStorageItem', id: msg.id, result: value ? wordToSerialized(value) : null };
        break;
      }
      case 'getStorageMapEntries': {
        const storage = await getAccountStorage(client, msg.accountBech32);
        const entries = storage?.getMapEntries(msg.slotName) ?? [];
        response = { type: 'getStorageMapEntries', id: msg.id, result: entries.map(e => ({ key: e.key, value: e.value })) };
        break;
      }
      case 'getFaucetInfo': {
        const fetched = await client.getAccountDetails(Address.fromBech32(msg.accountBech32).accountId());
        const account = fetched.account();
        if (!account) {
          response = { type: 'getFaucetInfo', id: msg.id, result: null };
        } else {
          const faucet = BasicFungibleFaucetComponent.fromAccount(account);
          response = { type: 'getFaucetInfo', id: msg.id, result: { symbol: faucet.symbol().toString(), decimals: faucet.decimals() } };
        }
        break;
      }
      default:
        response = { type: 'error', id: msg.id, message: `Unknown request type: ${(msg as { type: string }).type}` };
    }
  } catch (err) {
    response = { type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) };
  }

  self.postMessage(response);
};

self.postMessage({ type: 'ready' } satisfies RpcReady);
