import {
  type BannerLevel,
  dismissStatusBanner,
  getStatusBannerServerSnapshot,
  getStatusBannerSnapshot,
  subscribeStatusBanner,
} from '@/services/statusBanner';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';

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
  const { banner, dismissed } = useSyncExternalStore(
    subscribeStatusBanner,
    getStatusBannerSnapshot,
    getStatusBannerServerSnapshot,
  );

  if (!banner || dismissed) return null;

  const styles = levelStyles[banner.level];
  const Icon = banner.level === 'info' ? Info : AlertTriangle;

  return (
    <div className={`w-full ${styles.bg} border-b ${styles.border} mb-4`}>
      <div className='max-w-5xl mx-auto px-4 py-2 flex items-center gap-3'>
        <Icon className={`h-4 w-4 shrink-0 ${styles.text}`} />
        <p className={`flex-1 text-xs font-light ${styles.text}`}>
          {banner.text}
        </p>
        <button
          onClick={dismissStatusBanner}
          className={`shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${styles.text}`}
          aria-label='Dismiss banner'
        >
          <X className='h-3.5 w-3.5' />
        </button>
      </div>
    </div>
  );
}
