/**
 * Message protocol for the RPC web worker.
 * Each operation fetches account details in the worker, extracts the
 * specific data needed, and returns only small plain-serializable values.
 */

// A Word is 4 felts, each represented as a bigint string for serialization
export type SerializedWord = [string, string, string, string];

// --- Slot query descriptors for batch reads ---

export interface SlotItemQuery {
  kind: 'item';
  slotName: string;
}

export interface SlotMapItemQuery {
  kind: 'mapItem';
  slotName: string;
  key: SerializedWord;
}

export interface SlotMapEntriesQuery {
  kind: 'mapEntries';
  slotName: string;
}

export type SlotQuery = SlotItemQuery | SlotMapItemQuery | SlotMapEntriesQuery;

// --- Slot result types ---

export interface SlotItemResult {
  kind: 'item';
  value: SerializedWord | null;
}

export interface SlotMapItemResult {
  kind: 'mapItem';
  value: SerializedWord | null;
}

export interface SlotMapEntriesResult {
  kind: 'mapEntries';
  entries: { key: string; value: string }[];
}

export type SlotResult = SlotItemResult | SlotMapItemResult | SlotMapEntriesResult;

// --- Requests ---

export interface GetAccountStorageRequest {
  type: 'getAccountStorage';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
  queries: SlotQuery[];
}

export interface GetFaucetInfoRequest {
  type: 'getFaucetInfo';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
}

export type WorkerRequest =
  | GetAccountStorageRequest
  | GetFaucetInfoRequest;

// --- Responses ---

export interface GetAccountStorageResponse {
  type: 'getAccountStorage';
  id: number;
  results: SlotResult[];
}

export interface GetFaucetInfoResponse {
  type: 'getFaucetInfo';
  id: number;
  result: { symbol: string; decimals: number } | null;
}

export interface RpcErrorResponse {
  type: 'error';
  id: number;
  message: string;
}

export interface RpcReady {
  type: 'ready';
}

export type WorkerResponse =
  | GetAccountStorageResponse
  | GetFaucetInfoResponse
  | RpcErrorResponse;

export type WorkerOutgoing = WorkerResponse | RpcReady;
