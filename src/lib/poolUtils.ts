import type { TokenConfig } from '@/providers/ZoroProvider';

const STORAGE_KEY = 'zoro-created-pools';

export interface CreatedPoolDraft {
  id: string;
  type: 'xyk';
  tokenA: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  tokenB: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  feeBps: number;
  createdAt: number;
  status: 'draft';
}

export function readCreatedPools() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CreatedPoolDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCreatedPools(pools: CreatedPoolDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}

export function clearCreatedPools() {
  writeCreatedPools([]);
}
