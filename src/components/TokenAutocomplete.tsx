import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_MAX_VISIBLE = 10;

export function TokenAutocomplete({
  tokens,
  value,
  onChange,
  disabled,
  excludeFaucetIdBech32,
  disabledBech32s,
  priorityBech32s,
  maxVisible = DEFAULT_MAX_VISIBLE,
  placeholder = 'Select token',
  className,
}: {
  tokens: TokenConfig[];
  value?: TokenConfig;
  onChange: (faucetIdBech32: string) => void;
  disabled?: boolean;
  /** Hide this token entirely from the list (legacy behaviour). */
  excludeFaucetIdBech32?: string;
  /** Tokens in this set are shown but greyed out with "Not available". */
  disabledBech32s?: ReadonlySet<string>;
  /** Tokens in this set are sorted to the top. */
  priorityBech32s?: ReadonlySet<string>;
  /** Max tokens shown in the dropdown (default 10). */
  maxVisible?: number;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tokens.filter(t => t.faucetIdBech32 !== excludeFaucetIdBech32);
    if (q) {
      list = list.filter(t =>
        t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
      );
    }

    if (priorityBech32s && priorityBech32s.size > 0) {
      const priority: TokenConfig[] = [];
      const rest: TokenConfig[] = [];
      for (const t of list) {
        if (priorityBech32s.has(t.faucetIdBech32)) {
          priority.push(t);
        } else {
          rest.push(t);
        }
      }
      list = [...priority, ...rest];
    }

    if (maxVisible > 0 && list.length > maxVisible) {
      list = list.slice(0, maxVisible);
    }

    return list;
  }, [excludeFaucetIdBech32, query, tokens, priorityBech32s, maxVisible]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [activeIndex, filtered.length]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          className={cn(
            'h-auto relative rounded-xl pl-10 pr-2 py-2 text-xs sm:text-sm bg-background hover:bg-background border-border/60 font-normal gap-2 min-w-[110px] justify-between',
            className,
          )}
        >
          <span className='absolute left-1 top-1'>
            <AssetIcon symbol={value?.symbol ?? ''} />
          </span>
          <span className='truncate'>
            {value?.symbol ?? placeholder}
          </span>
          <ChevronDown className='h-4 w-4 opacity-70' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-[280px] rounded-xl p-2'
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className='relative mb-2'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search token...'
            className='pl-9 rounded-lg bg-muted/40 border-muted-foreground/20'
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filtered[activeIndex];
                if (!item || disabledBech32s?.has(item.faucetIdBech32)) return;
                onChange(item.faucetIdBech32);
                setOpen(false);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
        </div>

        <div className='max-h-[280px] overflow-auto'>
          {filtered.length === 0 && (
            <div className='px-2 py-2 text-sm text-muted-foreground'>
              No tokens found
            </div>
          )}
          {filtered.map((t, idx) => {
            const isUnavailable = disabledBech32s?.has(t.faucetIdBech32) ?? false;
            return (
              <DropdownMenuItem
                key={t.faucetIdBech32}
                disabled={isUnavailable}
                className={cn(
                  'rounded-lg flex items-center gap-2 py-2',
                  isUnavailable
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer',
                  idx === activeIndex && !isUnavailable && 'bg-accent',
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onSelect={(e) => {
                  if (isUnavailable) {
                    e.preventDefault();
                    return;
                  }
                  onChange(t.faucetIdBech32);
                  setOpen(false);
                }}
              >
                <AssetIcon symbol={t.symbol} />
                <div className='flex flex-col leading-tight flex-1 min-w-0'>
                  <span className='text-sm font-medium'>{t.symbol}</span>
                  <span className='text-xs text-muted-foreground truncate max-w-[210px]'>
                    {t.name}
                  </span>
                </div>
                {isUnavailable && (
                  <span className='text-[10px] text-muted-foreground whitespace-nowrap'>
                    Not available
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
