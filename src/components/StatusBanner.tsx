import { AlertTriangle, Info, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const BANNER_URL = '/banner.md';
const BANNER_POLL_MS = 180_000;

type BannerLevel = 'info' | 'warning' | 'error';

interface ParsedBanner {
  level: BannerLevel;
  text: string;
}

function parseBanner(raw: string): ParsedBanner | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();

  let level: BannerLevel = 'info';
  let text = trimmed;

  // Support optional front-matter style: `level: warning`
  const levelMatch = firstLine.match(/^level:\s*(info|warning|error)$/i);
  if (levelMatch) {
    level = levelMatch[1].toLowerCase() as BannerLevel;
    text = lines.slice(1).join('\n').trim();
  }

  if (!text) return null;
  return { level, text };
}

const levelStyles: Record<BannerLevel, { bg: string; text: string; border: string }> = {
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/20',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-500/20',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-500/20',
  },
};

export function StatusBanner() {
  const [banner, setBanner] = useState<ParsedBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchBanner = useCallback(async () => {
    try {
      const res = await fetch(BANNER_URL, { cache: 'no-store' });
      if (!res.ok) {
        setBanner(null);
        return;
      }
      const text = await res.text();
      setBanner(parseBanner(text));
    } catch {
      setBanner(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBanner();
    const id = setInterval(fetchBanner, BANNER_POLL_MS);
    return () => clearInterval(id);
  }, [fetchBanner]);

  if (!banner || dismissed) return null;

  const styles = levelStyles[banner.level];
  const Icon = banner.level === 'info' ? Info : AlertTriangle;

  return (
    <div className={`w-full ${styles.bg} border-b ${styles.border}`}>
      <div className='max-w-5xl mx-auto px-4 py-2 flex items-center gap-3'>
        <Icon className={`h-4 w-4 shrink-0 ${styles.text}`} />
        <p className={`flex-1 text-xs font-light ${styles.text}`}>
          {banner.text}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${styles.text}`}
          aria-label='Dismiss banner'
        >
          <X className='h-3.5 w-3.5' />
        </button>
      </div>
    </div>
  );
}
