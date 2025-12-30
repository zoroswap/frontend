import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Info, Settings, X } from 'lucide-react';
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
    <div className='relative'>
      <Button
        variant='ghost'
        size='icon'
        onClick={handleToggle}
        className={`transition-all duration-200 hover:bg-accent hover:text-accent-foreground ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        aria-label='Slippage settings'
      >
        <Settings className='h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem]' />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 bg-black/20'
            onClick={handleClose}
          />

          {/* Settings Panel */}
          <Card className='absolute top-10 right-0 w-[200px] sm:w-[220px] z-20 shadow-lg'>
            <CardContent className='p-4 space-y-3'>
              {/* Header */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold'>Max slippage</h3>
                  <div className='group relative'>
                    <Info className='h-3 w-3 text-muted-foreground cursor-help' />
                    {/* Tooltip */}
                    <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10'>
                      <div className='bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border max-w-[200px] text-center'>
                        Your transaction will revert if the price changes unfavorably by
                        more than this percentage
                        <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover'>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleClose}
                  className='h-5 w-5 hover:bg-accent hover:text-accent-foreground'
                  aria-label='Close settings'
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>

              {/* Slippage Input */}
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    type='number'
                    value={inputValue}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    className='text-center text-sm pr-8'
                    min='0'
                    max='50'
                    step='0.1'
                    placeholder='0.5'
                  />
                  <span className='absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground pointer-events-none'>
                    %
                  </span>
                </div>

                {/* Conditional Warnings */}
                {slippage > 5 && (
                  <div className='text-xs text-orange-600 text-center'>
                    High slippage risk
                  </div>
                )}

                {slippage < 0.1 && slippage > 0 && (
                  <div className='text-xs text-amber-500 text-center'>
                    May fail due to low slippage
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Slippage;
