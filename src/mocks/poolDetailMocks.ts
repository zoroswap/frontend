import type { UTCTimestamp } from 'lightweight-charts';

export type MockCandle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MockRecentTx = {
  type: 'Swap' | 'Add' | 'Remove';
  amountIn: string;
  amountOut: string;
  account: string;
  timeAgo: string;
};

type Range = '1D' | '1W' | '1M' | 'ALL';

function hashStringToSeed(input: string) {
  // Deterministic, small, and good enough for mock data.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function getRangeSpec(range: Range) {
  switch (range) {
    case '1D':
      return { intervalSec: 5 * 60, points: 24 * 12 };
    case '1W':
      return { intervalSec: 60 * 60, points: 24 * 7 };
    case '1M':
      return { intervalSec: 4 * 60 * 60, points: 30 * 6 };
    case 'ALL':
    default:
      return { intervalSec: 24 * 60 * 60, points: 365 };
  }
}

export function getMockPoolCandles({
  seedKey,
  range,
}: {
  seedKey: string;
  range: Range;
}): MockCandle[] {
  const seed = hashStringToSeed(`${seedKey}:${range}`);
  const rand = mulberry32(seed);

  const { intervalSec, points } = getRangeSpec(range);
  const nowSec = Math.floor(Date.now() / 1000);
  const end = nowSec - (nowSec % intervalSec);
  const start = end - intervalSec * points;

  // Pick a stable-ish base so different pools “feel” different.
  const base = 0.5 + rand() * 250;
  let prevClose = base * (0.95 + rand() * 0.1);

  const candles: MockCandle[] = [];
  for (let i = 0; i < points; i++) {
    const t = start + i * intervalSec;

    // Gentle drift + noise + occasional impulse to mimic TV candles.
    const drift = (rand() - 0.5) * 0.0012;
    const noise = (rand() - 0.5) * 0.006;
    const impulse = rand() < 0.03 ? (rand() - 0.5) * 0.05 : 0;
    const change = clamp(drift + noise + impulse, -0.08, 0.08);

    const open = prevClose;
    const close = Math.max(0.0001, open * (1 + change));
    const wick = 0.002 + rand() * 0.02;
    const high = Math.max(open, close) * (1 + wick * (0.4 + rand()));
    const low = Math.min(open, close) * (1 - wick * (0.4 + rand()));

    const volBase = 300 + rand() * 4000;
    const vol = volBase * (1 + Math.min(2.5, Math.abs(change) * 25));

    candles.push({
      time: t as UTCTimestamp,
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: Math.round(vol),
    });

    prevClose = close;
  }

  return candles;
}

export function getMockRecentTransactions({
  seedKey,
  baseSymbol,
}: {
  seedKey: string;
  baseSymbol: string;
}): MockRecentTx[] {
  const seed = hashStringToSeed(`tx:${seedKey}`);
  const rand = mulberry32(seed);

  const mkAcct = () => {
    const hex = Array.from({ length: 8 }, () => Math.floor(rand() * 16).toString(16)).join('');
    const hex2 = Array.from({ length: 8 }, () => Math.floor(rand() * 16).toString(16)).join('');
    return `0x${hex}...${hex2}`;
  };

  const ago = (mins: number) => mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} hr ago`;

  const types: MockRecentTx['type'][] = ['Swap', 'Add', 'Remove', 'Swap', 'Swap'];
  return types.map((type, i) => {
    const mins = 2 + i * (5 + Math.floor(rand() * 7));
    const amountA = 0.05 + rand() * 4;
    const price = 0.5 + rand() * 250;
    const amountB = amountA * price;

    const inStr = type === 'Swap'
      ? `${formatCompact(amountA)} ${baseSymbol}`
      : `${formatCompact(amountA)} ${baseSymbol}`;
    const outStr = type === 'Swap'
      ? `${formatCompact(amountB)} USDC`
      : `${formatCompact(amountB)} USDC`;

    return {
      type,
      amountIn: inStr,
      amountOut: outStr,
      account: mkAcct(),
      timeAgo: ago(mins),
    };
  });
}

