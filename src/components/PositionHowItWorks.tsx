import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  Layers,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface Step {
  number: number;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Deposit',
    description: (
      <>
        Deposit tokens into a{' '}
        <span className='text-foreground/90'>Position</span> note on Miden. Your assets
        stay yours and can always be reclaimed in the wallet or thru app.
      </>
    ),
    icon: Layers,
  },
  {
    number: 2,
    title: 'Swap',
    description: (
      <>
        When you place a swap, ZoroSwap issues a new{' '}
        <span className='text-foreground/90'>Position</span> note with your updated
        balances.
      </>
    ),
    icon: ArrowLeftRight,
  },
  {
    number: 3,
    title: 'Withdraw',
    description: (
      <>
        Reclaim your assets from{' '}
        <span className='text-foreground/90'>Position</span> note thru the wallet or the
        app.
      </>
    ),
    icon: LogOut,
  },
];

interface PositionHowItWorksProps {
  className?: string;
}

function StepCard({ step, isLast }: { step: Step; isLast: boolean }) {
  const Icon = step.icon;
  return (
    <div className='group relative flex gap-3.5 sm:gap-4 min-w-0'>
      <div className='relative flex flex-col items-center shrink-0'>
        <div className='relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/[0.12] ring-1 ring-primary/25 transition-colors group-hover:bg-primary/[0.18]'>
          <Icon className='h-[18px] w-[18px] sm:h-5 sm:w-5 text-primary' strokeWidth={1.75} />
        </div>
        {!isLast && (
          <div
            className='w-px flex-1 min-h-4 mt-2 bg-border/50'
            aria-hidden
          />
        )}
      </div>

      <div className={cn('min-w-0 flex-1', !isLast && 'pb-5')}>
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-1'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-primary/80 shrink-0'>
            Step {step.number}
          </span>
          <h3 className='text-sm font-semibold text-foreground'>{step.title}</h3>
        </div>
        <p className='text-[13px] sm:text-sm text-muted-foreground leading-relaxed'>
          {step.description}
        </p>
      </div>
    </div>
  );
}

export function PositionHowItWorks({ className }: PositionHowItWorksProps) {
  return (
    <section
      className={cn(
        'relative w-full overflow-hidden rounded-2xl',
        'border border-border/40 bg-card/80 backdrop-blur-sm',
        'shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]',
        className,
      )}
      aria-label='How ZoroSwap works'
    >
      <div
        className='pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.35] dark:opacity-[0.22]'
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(var(--primary) / 0.55) 0.6px, transparent 0.6px)',
          backgroundSize: '4px 4px',
          maskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className='relative px-4 py-4 sm:px-6 sm:py-5'>
        <p className='text-[13px] sm:text-sm text-muted-foreground mb-4 sm:mb-5'>
          How ZoroSwap works
        </p>

        <div className='relative grid grid-cols-1 gap-0'>
          {STEPS.map((step, index) => (
            <StepCard key={step.number} step={step} isLast={index === STEPS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
