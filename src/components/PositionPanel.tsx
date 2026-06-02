import AssetIcon from '@/components/AssetIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formalBigIntFormat, truncateId } from '@/lib/format';
import { type PositionInfoResponse } from '@/lib/positionsApi';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface PositionPanelProps {
  positionId: string | null;
  positionInfo: PositionInfoResponse | null;
  tokens: Record<string, TokenConfig>;
  isLoading: boolean;
  onReclaim: () => Promise<void>;
  successHighlight?: boolean;
}

export function PositionPanel({
  positionId,
  positionInfo,
  tokens,
  isLoading,
  onReclaim,
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
      className={`border border-border/60 rounded-xl sm:rounded-2xl bg-card shadow-none mb-4 lg:mb-0${
        successHighlight ? ' tx-success-flourish' : ''
      }`}
    >
      <CardContent className='p-4 sm:p-6'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs sm:text-sm text-primary font-semibold'>Position</span>
          {positionId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => void onReclaim()}
              disabled={/*isLoading*/ true}
              className='h-8 text-xs opacity-10'
            >
              {isLoading
                ? <Loader2 className='h-3 w-3 animate-spin' />
                : 'Reclaim'}
            </Button>
          )}
        </div>

        {positionId
          ? (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground'>Active position on server</p>
                <button
                  type='button'
                  onClick={() => void copyPositionId()}
                  className='font-mono text-sm hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer text-left break-all'
                >
                  {copied
                    ? (
                      <span className='inline-flex items-center gap-1'>
                        <CheckCircle className='h-3 w-3 text-green-500' />
                        Copied
                      </span>
                    )
                    : truncateId(positionId)}
                </button>
              </div>

              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground'>Balances</p>
                {positionInfo === null
                  ? (
                    <div className='space-y-2'>
                      <span className='inline-block h-4 w-32 rounded bg-muted-foreground/15 animate-pulse' />
                    </div>
                  )
                  : assets.length === 0
                  ? (
                    <p className='text-sm text-muted-foreground'>
                      No assets in position.
                    </p>
                  )
                  : (
                    <ul className='space-y-1.5'>
                      {assets.map((asset) => (
                        <li
                          key={asset.bech32}
                          className='flex items-center justify-between gap-2 text-sm rounded-lg bg-muted/50 px-2.5 py-2'
                        >
                          <span className='inline-flex items-center gap-1.5'>
                            <AssetIcon symbol={asset.symbol} size={16} />
                            <span>{asset.symbol}</span>
                          </span>
                          <span className='font-mono'>
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
                <div className='flex items-center gap-1.5 text-xs'>
                  <span className='text-muted-foreground'>Note:</span>
                  <span className='font-mono'>{truncateId(positionInfo.note_id)}</span>
                  <a
                    href={`https://testnet.midenscan.com/note/${positionInfo.note_id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground'
                  >
                    <ExternalLink className='h-3 w-3' />
                  </a>
                </div>
              )}
            </div>
          )
          : (
            <p className='text-sm text-muted-foreground'>
              No position open. Enter an amount and click Open Position to deposit into a
              position note.
            </p>
          )}
      </CardContent>
    </Card>
  );
}
