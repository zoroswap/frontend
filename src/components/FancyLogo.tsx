import { cn } from '@/lib/utils';

interface FancyLogoProps {
  className?: string;
  size?: number;
}

export function FancyLogo({ className, size = 56 }: FancyLogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-white dark:bg-black ring-1 ring-border',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src='/zoro-logo.svg'
        alt='ZoroSwap'
        className='h-[70%] w-[70%] object-contain'
      />
    </div>
  );
}
