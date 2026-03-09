import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Settings, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SlippageProps {
  readonly slippage: number;
  readonly onSlippageChange: (slippage: number) => void;
}

const Slippage = ({ slippage, onSlippageChange }: SlippageProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(slippage.toString());

  const handleSlippageChange = useCallback((value: string): void => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      onSlippageChange(numValue);
    }
  }, [onSlippageChange]);

  const handleToggle = useCallback((): void => {
    setIsOpen(!isOpen);
    // Reset input to current slippage when opening
    if (!isOpen) {
      setInputValue(slippage.toString());
    }
  }, [isOpen, slippage]);

  const handleClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  // Update input when slippage changes externally
  useEffect(() => {
    setInputValue(slippage.toString());
  }, [slippage]);

  return (
    <>
      <Button
        variant='ghost'
        onClick={handleToggle}
        className={`h-auto w-auto p-1 transition-all duration-200 hover:bg-accent hover:text-accent-foreground ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        aria-label='Slippage settings'
      >
        <Settings className='h-16 w-16' strokeWidth={1} />
      </Button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 bg-black/20 z-10'
            onClick={handleClose}
          />

          <Card className='absolute top-full right-0 mt-1 w-[280px] z-20 shadow-lg rounded-2xl border border-border/60'>
            <CardContent className='p-5 space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg' style={{ fontWeight: 300 }}>Max Slippage</h3>
                <button
                  onClick={handleClose}
                  className='text-muted-foreground hover:text-foreground transition-colors'
                  aria-label='Close settings'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>

              <div className='relative'>
                <Input
                  type='number'
                  value={inputValue}
                  onChange={(e) => handleSlippageChange(e.target.value)}
                  className='text-center text-lg font-medium pr-10 h-12 rounded-xl'
                  min='0'
                  max='50'
                  step='0.1'
                  placeholder='0.5'
                />
                <span className='absolute right-4 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground pointer-events-none'>
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
};

export default Slippage;
