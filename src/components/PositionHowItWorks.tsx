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
        Put your assets into a{' '}
        <span className='text-foreground/90'>Position</span> — a private Miden note that
        holds your balances.
      </>
    ),
    icon: Layers,
  },
  {
    number: 2,
    title: 'Swap',
    description: (
      <>
        Each trade updates your{' '}
        <span className='text-foreground/90'>Position</span> — ZoroSwap recreates the note
        with your new asset mix.
      </>
    ),
    icon: ArrowLeftRight,
  },
  {
    number: 3,
    title: 'Withdraw',
    description: (
      <>
        Reclaim your{' '}
        <span className='text-foreground/90'>Position</span> note anytime through the app
        or your wallet.
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
            className='sm:hidden w-px flex-1 min-h-4 mt-2 bg-gradient-to-b from-border to-transparent'
            aria-hidden
          />
        )}
      </div>

      <div className='min-w-0 pb-5 sm:pb-0 flex-1'>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-primary/80'>
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
        className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.06] to-transparent'
        aria-hidden
      />
      <div
        className='pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent'
        aria-hidden
      />

      <div className='relative px-4 py-4 sm:px-6 sm:py-5'>
        <p className='text-[13px] sm:text-sm text-muted-foreground mb-4 sm:mb-5'>
          How ZoroSwap works
        </p>

        <div className='relative grid grid-cols-1 sm:grid-cols-3 sm:gap-6 lg:gap-8'>
          <div
            className='hidden sm:block absolute top-[1.375rem] left-[calc(16.666%-0.5rem)] right-[calc(16.666%-0.5rem)] h-px bg-border/60'
            aria-hidden
          />

          {STEPS.map((step, index) => (
            <StepCard key={step.number} step={step} isLast={index === STEPS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
