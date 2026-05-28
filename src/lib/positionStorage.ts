import type { AccountId } from '@miden-sdk/miden-sdk';
import { accountIdToBech32 } from './utils';

const STORAGE_PREFIX = 'zoro-position-id-';

function storageKey(accountId: AccountId): string {
  return `${STORAGE_PREFIX}${accountIdToBech32(accountId)}`;
}

export function getStoredPositionId(accountId: AccountId): string | null {
  return localStorage.getItem(storageKey(accountId));
}

export function setStoredPositionId(accountId: AccountId, positionId: string): void {
  localStorage.setItem(storageKey(accountId), positionId);
}

export function clearStoredPositionId(accountId: AccountId): void {
  localStorage.removeItem(storageKey(accountId));
}
