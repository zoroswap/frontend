import { CheckCircle2, Loader2 } from 'lucide-react';

export interface ProgressBarProps {
  /** Step labels shown in order. */
  steps: readonly string[];
  /** 0-based index of the current step. When null, the bar is typically hidden by the parent. */
  currentStepIndex: number | null;
  /** Optional title above the bar (e.g. "Progress"). */
  title?: string;
  /** Optional className for the wrapper. */
  className?: string;
}

export function ProgressBar({
  steps,
  currentStepIndex,
  title = 'Progress',
  className = '',
}: ProgressBarProps) {
  if (currentStepIndex === null) return null;

  return (
    <div
      className={`rounded-xl border border-border bg-muted/20 p-4 space-y-3 ${className}`}
      role='status'
      aria-label={`${title}: step ${currentStepIndex + 1} of ${steps.length}`}
    >
      <p className='text-sm font-medium'>{title}</p>
      <div className='h-2 rounded-full bg-muted overflow-hidden'>
        <div
          className='h-full bg-primary transition-all duration-300'
          style={{
            width: `${
              currentStepIndex === steps.length - 1
                ? ((currentStepIndex + 0.5) / steps.length) * 100
                : ((currentStepIndex + 1) / steps.length) * 100
            }%`,
          }}
        />
      </div>
      <ul className='space-y-2' aria-label='Steps'>
        {steps.map((label, i) => {
          const done = i < currentStepIndex;
          const current = i === currentStepIndex;
          return (
            <li key={label} className='flex items-center gap-2 text-sm'>
              {done ? (
                <CheckCircle2
                  className='h-4 w-4 shrink-0 text-green-600 dark:text-green-400'
                  aria-hidden
                />
              ) : current ? (
                <Loader2
                  className='h-4 w-4 shrink-0 animate-spin text-primary'
                  aria-hidden
                />
              ) : (
                <span
                  className='h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40'
                  aria-hidden
                />
              )}
              <span
                className={
                  done
                    ? 'text-muted-foreground'
                    : current
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground/70'
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
