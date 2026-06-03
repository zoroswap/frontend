import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formalBigIntFormat, truncateId } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type PositionInfoResponse } from '@/lib/positionsApi';
import { type TokenConfig } from '@/providers/ZoroProvider';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

interface PositionPanelProps {
  positionId: string | null;
  positionInfo: PositionInfoResponse | null;
  tokens: Record<string, TokenConfig>;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onReclaim: () => Promise<void>;
  onRemove: () => void;
  successHighlight?: boolean;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80'>
      {children}
    </p>
  );
}

export function PositionPanel({
  positionId,
  positionInfo,
  tokens,
  isLoading: _isLoading,
  isRefreshing = false,
  onRefresh,
  onReclaim: _onReclaim,
  onRemove,
  successHighlight = false,
}: PositionPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyPositionId = useCallback(async () => {
    if (!positionId) return;
    try {
      await navigator.clipboard.writeText(positionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }, [positionId]);

  const assets = useMemo(() => {
    if (!positionInfo) return [];
    return positionInfo.assets.map(([bech32, amount]) => {
      const token = tokens[bech32];
      return {
        bech32,
        symbol: token?.symbol ?? truncateId(bech32),
        decimals: token?.decimals ?? 0,
        amount: BigInt(amount),
      };
    });
  }, [positionInfo, tokens]);

  return (
    <Card
      className={cn(
        'relative overflow-hidden border border-border/50 rounded-xl sm:rounded-2xl',
        'bg-card shadow-none mb-4 lg:mb-0',
        successHighlight && 'tx-success-flourish',
      )}
    >
      <div
        className='halftone pointer-events-none absolute inset-0'
        aria-hidden
      />
      <CardContent className='relative p-5 sm:p-6'>
        <div className='flex items-start justify-between gap-3 mb-5'>
          <div className='space-y-1 min-w-0'>
            <h2 className='font-cal-sans text-lg sm:text-xl tracking-tight text-foreground'>
              Position
            </h2>
            {positionId && (
              <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                <span className='h-1.5 w-1.5 rounded-full bg-current animate-pulse' />
                Active
              </span>
            )}
          </div>
          {positionId && onRefresh && (
            <Button
              variant='ghost'
              size='icon'
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              className='h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60'
              aria-label='Refresh position'
            >
              {isRefreshing
                ? <Loader2 className='h-4 w-4 animate-spin' />
                : <RefreshCw className='h-4 w-4' />}
            </Button>
          )}
        </div>

        {positionId
          ? (
            <div className='space-y-5'>
              <div className='space-y-2'>
                <SectionLabel>Position ID</SectionLabel>
                <button
                  type='button'
                  onClick={() => void copyPositionId()}
                  className={cn(
                    'group flex w-full items-center justify-between gap-2 rounded-xl',
                    'border border-border/60 bg-muted/25 px-3.5 py-3 text-left',
                    'transition-colors hover:border-primary/25 hover:bg-muted/40',
                  )}
                >
                  <span className='font-mono text-sm text-foreground/90 truncate'>
                    {copied
                      ? (
                        <span className='inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'>
                          <CheckCircle className='h-3.5 w-3.5 shrink-0' />
                          Copied
                        </span>
                      )
                      : truncateId(positionId)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-md p-1.5 text-muted-foreground',
                      'transition-colors group-hover:bg-background/60 group-hover:text-foreground',
                    )}
                  >
                    <Copy className='h-3.5 w-3.5' />
                  </span>
                </button>
              </div>

              <div className='space-y-2.5'>
                <SectionLabel>Holdings</SectionLabel>
                {positionInfo === null
                  ? (
                    <div className='space-y-2'>
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className='h-[52px] rounded-xl bg-muted/30 animate-pulse'
                        />
                      ))}
                    </div>
                  )
                  : assets.length === 0
                  ? (
                    <p className='text-sm text-muted-foreground py-2'>
                      No assets in this position yet.
                    </p>
                  )
                  : (
                    <ul className='space-y-2'>
                      {assets.map((asset) => (
                        <li
                          key={asset.bech32}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-xl',
                            'border border-border/50 bg-background/40 px-3.5 py-3',
                          )}
                        >
                          <span className='inline-flex items-center gap-2.5 min-w-0'>
                            <span className='rounded-full ring-2 ring-background shadow-sm'>
                              <AssetIcon symbol={asset.symbol} size={28} />
                            </span>
                            <span className='font-medium text-sm text-foreground'>
                              {asset.symbol}
                            </span>
                          </span>
                          <span className='font-mono text-base font-semibold tabular-nums text-foreground'>
                            {formalBigIntFormat({
                              val: asset.amount,
                              expo: asset.decimals,
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              {positionInfo?.note_id && (
                <div className='space-y-2'>
                  <SectionLabel>On-chain note</SectionLabel>
                  <div className='flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5'>
                    <span className='flex-1 min-w-0 font-mono text-xs text-muted-foreground truncate'>
                      {truncateId(positionInfo.note_id)}
                    </span>
                    <a
                      href={`https://testnet.midenscan.com/note/${positionInfo.note_id}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={cn(
                        'shrink-0 inline-flex items-center justify-center rounded-lg p-2',
                        'text-muted-foreground transition-colors',
                        'hover:bg-background/80 hover:text-foreground',
                      )}
                      aria-label='View note on explorer'
                    >
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  </div>
                </div>
              )}

              <div className='pt-1 space-y-2'>
                {/* <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void _onReclaim()}
                  disabled={_isLoading}
                  className='w-full h-10 rounded-xl text-xs font-medium border-border/70 bg-background/50 hover:bg-muted/50'
                >
                  {_isLoading
                    ? <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    : 'Reclaim'}
                </Button> */}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onRemove}
                  className={cn(
                    'w-full h-10 rounded-xl text-xs font-medium',
                    'border-destructive/25 bg-background/50 text-destructive',
                    'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40',
                  )}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  Remove position
                </Button>
              </div>
            </div>
          )
          : (
            <div className='flex flex-col items-center text-center py-6 px-2'>
              <span className='mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground'>
                <Wallet className='h-6 w-6' />
              </span>
              <p className='text-sm font-medium text-foreground mb-1'>
                No position yet
              </p>
              <p className='text-xs text-muted-foreground leading-relaxed max-w-[240px]'>
                Add tokens below and open a position to start swapping privately.
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
