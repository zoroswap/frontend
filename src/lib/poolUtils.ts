import type { TokenConfig } from '@/providers/ZoroProvider';

const STORAGE_KEY = 'zoro-created-pools';

export interface CreatedPoolDraft {
  id: string;
  type: 'xyk';
  tokenA: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  tokenB: Pick<TokenConfig, 'symbol' | 'name' | 'faucetIdBech32'>;
  feeBps: number;
  createdAt: number;
  status: 'draft' | 'deployed';
  /** Set when status is 'deployed'; used for linking to pool detail (account id bech32). */
  poolIdBech32?: string;
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

export function removeCreatedPool(id: string) {
  const pools = readCreatedPools().filter((p) => p.id !== id);
  writeCreatedPools(pools);
}

export function updateCreatedPool(
  id: string,
  update: Partial<Pick<CreatedPoolDraft, 'status' | 'poolIdBech32'>>,
) {
  const pools = readCreatedPools().map((p) =>
    p.id === id ? { ...p, ...update } : p,
  );
  writeCreatedPools(pools);
}
