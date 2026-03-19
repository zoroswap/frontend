import { FancyLogo } from '@/components/FancyLogo';
import { poweredByMiden } from '@/components/PoweredByMiden';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const DISCLAIMER_STORAGE_KEY = 'zoro-disclaimer-accepted';

function hasAcceptedDisclaimer(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true';
}

function acceptDisclaimer(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
}

interface DisclaimerModalProps {
  onAccept: () => void;
}

function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const handleAccept = useCallback(() => {
    setVisible(false);
    acceptDisclaimer();
    setTimeout(onAccept, 200);
  }, [onAccept]);

  return createPortal(
    <div
      className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 sm:p-8'
      role='dialog'
      aria-modal='true'
      aria-labelledby='disclaimer-title'
    >
      <Card
        className={`relative w-full max-w-lg border-border bg-card shadow-xl transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className='flex flex-col items-center text-center space-y-4 pb-2 pt-10 px-10'>
          <FancyLogo size={128} />
          <div className='space-y-5'>
            <CardTitle
              id='disclaimer-title'
              className='text-2xl font-bold font-cal-sans text-foreground sm:text-3xl'
            >
              Open Alpha
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground leading-relaxed'>
              ZoroSwap is under active development — features and interfaces may change
              without notice, and you may run into bugs.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col items-center text-center space-y-6 px-10 pb-10 pt-2'>
          <p className='text-xs text-muted-foreground leading-relaxed max-w-md'>
            The app runs on the Miden testnet. All tokens and assets here are for testing
            only and have no monetary value.
          </p>
          <Button
            type='button'
            size='lg'
            className='w-full max-w-sm rounded-lg font-medium'
            onClick={handleAccept}
          >
            I understand and want to continue
          </Button>
          <div className='flex justify-center'>
            {poweredByMiden}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body,
  );
}

/**
 * Renders the disclaimer modal when the user has not yet accepted it (once per
 * device via localStorage). Mount once at app root (e.g. inside ModalProvider).
 */
export function DisclaimerGate({ children }: { children: ReactNode }) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowDisclaimer(!hasAcceptedDisclaimer());
  }, [mounted]);

  const handleAccept = useCallback(() => {
    setShowDisclaimer(false);
  }, []);

  return (
    <>
      {children}
      {showDisclaimer && <DisclaimerModal onAccept={handleAccept} />}
    </>
  );
}
