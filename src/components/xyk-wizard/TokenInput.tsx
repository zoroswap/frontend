import { Input } from '@/components/ui/input';

export interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  symbol: string;
  balanceText: string;
  onMaxClick: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shown when value is out of range (e.g. exceeds balance). Empty input is not coerced to 0. */
  error?: string;
  /** Rendered under the input row, aligned left (e.g. 25%, 50%, 75%, 100% buttons). */
  bottomLeft?: React.ReactNode;
}

export function TokenInput({
  value,
  onChange,
  symbol,
  balanceText,
  onMaxClick,
  placeholder = '0',
  disabled = false,
  error,
  bottomLeft,
}: TokenInputProps) {
  const letter = (symbol || '?')[0].toUpperCase();

  return (
    <div className='p-4 rounded-xl bg-card overflow-hidden flex flex-col gap-4'>
      <div className='flex flex-1 items-center justify-between gap-3'>
        <Input
          type='text'
          inputMode='decimal'
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className='flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 h-auto text-[50px]'
        />
        <div className='flex items-center gap-2 shrink-0'>
          <span className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground shrink-0'>
            {letter}
          </span>
          <span className='font-medium text-sm'>{symbol}</span>
        </div>
      </div>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
          {bottomLeft}
        </div>
        <div className='flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0'>
          <button
            type='button'
            onClick={onMaxClick}
            className='text-right hover:text-foreground transition-colors'
          >
            {balanceText}
          </button>
          {error && (
            <span className='text-destructive font-medium' role='alert'>
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
