const BANNER_URL = '/banner.md';
const BANNER_POLL_MS = 180_000;

export type BannerLevel = 'info' | 'warning' | 'error';

export interface ParsedBanner {
  level: BannerLevel;
  text: string;
}

export interface StatusBannerSnapshot {
  banner: ParsedBanner | null;
  dismissed: boolean;
}

const serverSnapshot: StatusBannerSnapshot = { banner: null, dismissed: false };

let snapshot: StatusBannerSnapshot = { banner: null, dismissed: false };
const listeners = new Set<() => void>();
let pollId: ReturnType<typeof setInterval> | null = null;

function notify() {
  for (const l of listeners) l();
}

function sameBanner(a: ParsedBanner | null, b: ParsedBanner | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.level === b.level && a.text === b.text;
}

function commit(next: StatusBannerSnapshot) {
  if (next.dismissed === snapshot.dismissed && sameBanner(next.banner, snapshot.banner)) return;
  snapshot = next;
  notify();
}

function parseBanner(raw: string): ParsedBanner | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();

  let level: BannerLevel = 'info';
  let text = trimmed;

  const levelMatch = firstLine.match(/^level:\s*(info|warning|error)$/i);
  if (levelMatch) {
    level = levelMatch[1].toLowerCase() as BannerLevel;
    text = lines.slice(1).join('\n').trim();
  }

  if (!text) return null;
  return { level, text };
}

async function fetchBanner() {
  try {
    const res = await fetch(BANNER_URL, { cache: 'no-store' });
    if (!res.ok) {
      commit({ ...snapshot, banner: null });
      return;
    }
    const text = await res.text();
    commit({ ...snapshot, banner: parseBanner(text) });
  } catch {
    commit({ ...snapshot, banner: null });
  }
}

function ensurePolling() {
  if (pollId !== null) return;
  void fetchBanner();
  pollId = setInterval(() => void fetchBanner(), BANNER_POLL_MS);
}

export function subscribeStatusBanner(onStoreChange: () => void) {
  ensurePolling();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getStatusBannerSnapshot(): StatusBannerSnapshot {
  return snapshot;
}

export function getStatusBannerServerSnapshot(): StatusBannerSnapshot {
  return serverSnapshot;
}

export function dismissStatusBanner() {
  if (snapshot.dismissed) return;
  commit({ ...snapshot, dismissed: true });
}
