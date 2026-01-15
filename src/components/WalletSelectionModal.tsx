import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface WalletSelectionModalProps {
  readonly onClose: () => void;
  readonly onSelectMiden: () => void;
  readonly onSelectPara: () => void;
}

export function WalletSelectionModal({
  onClose,
  onSelectMiden,
  onSelectPara,
}: WalletSelectionModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(true);
    }, 0);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 280);
  }, [onClose]);

  const handleSelectMiden = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
      onSelectMiden();
    }, 280);
  }, [onClose, onSelectMiden]);

  const handleSelectPara = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
      onSelectPara();
    }, 280);
  }, [onClose, onSelectPara]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-all duration-300 ease-in-out ${
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'>
        <div
          className={`w-80 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-in-out ${
            isVisible && !isClosing
              ? 'opacity-100 translate-y-0 scale-100'
              : isVisible && isClosing
              ? 'opacity-0 translate-y-[-20px] scale-95'
              : 'opacity-0 translate-y-[20px] scale-95'
          }`}
        >
          <div className='bg-background border border-border rounded-2xl shadow-xl p-5'>
            {/* Header */}
            <div className='flex justify-between items-center mb-4'>
              <span className='font-semibold text-lg'>Connect Wallet</span>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleClose}
                className='h-8 w-8 rounded-full hover:bg-muted'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            {/* Wallet Options */}
            <div className='space-y-3'>
              {/* Miden Wallet Option */}
              <button
                onClick={handleSelectMiden}
                className='w-full p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left flex items-center gap-4'
              >
                <div className='w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center'>
                  <img
                    src='/miden-wallet-logo.svg'
                    alt='Miden Wallet'
                    className='w-6 h-6'
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className='font-medium'>Miden Wallet</div>
                  <div className='text-xs text-muted-foreground'>
                    Chrome browser extension
                  </div>
                </div>
              </button>

              {/* Para Wallet Option */}
              <button
                onClick={handleSelectPara}
                className='w-full p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left flex items-center gap-4'
              >
                <div className='w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center'>
                  <img
                    src='/para-wallet-logo.svg'
                    alt='Para Wallet'
                    className='w-6 h-6'
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className='font-medium'>Para</div>
                  <div className='text-xs text-muted-foreground'>
                    Email or social login
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
