/**
 * Message protocol for the RPC web worker.
 * Each operation fetches account details in the worker, extracts the
 * specific data needed, and returns only small plain-serializable values.
 */

// A Word is 4 felts, each represented as a bigint string for serialization
export type SerializedWord = [string, string, string, string];

// --- Requests ---

export interface GetStorageMapItemRequest {
  type: 'getStorageMapItem';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
  slotName: string;
  key: SerializedWord;
}

export interface GetStorageItemRequest {
  type: 'getStorageItem';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
  slotName: string;
}

export interface GetStorageMapEntriesRequest {
  type: 'getStorageMapEntries';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
  slotName: string;
}

export interface GetFaucetInfoRequest {
  type: 'getFaucetInfo';
  id: number;
  rpcEndpoint: string;
  accountBech32: string;
}

export type WorkerRequest =
  | GetStorageMapItemRequest
  | GetStorageItemRequest
  | GetStorageMapEntriesRequest
  | GetFaucetInfoRequest;

// --- Responses ---

export interface GetStorageMapItemResponse {
  type: 'getStorageMapItem';
  id: number;
  result: SerializedWord | null;
}

export interface GetStorageItemResponse {
  type: 'getStorageItem';
  id: number;
  result: SerializedWord | null;
}

export interface GetStorageMapEntriesResponse {
  type: 'getStorageMapEntries';
  id: number;
  result: { key: string; value: string }[];
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
  | GetStorageMapItemResponse
  | GetStorageItemResponse
  | GetStorageMapEntriesResponse
  | GetFaucetInfoResponse
  | RpcErrorResponse;

export type WorkerOutgoing = WorkerResponse | RpcReady;
