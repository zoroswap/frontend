import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { truncateId } from '@/lib/format';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

interface PositionPanelProps {
  positionId: string | null;
  isLoading: boolean;
  onReclaim: () => Promise<void>;
}

export function PositionPanel({ positionId, isLoading, onReclaim }: PositionPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyPositionId = useCallback(async () => {
    if (!positionId) return;
    try {
      await navigator.clipboard.writeText(positionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }, [positionId]);

  return (
    <Card className='border border-border/60 rounded-xl sm:rounded-2xl bg-card shadow-none mb-4'>
      <CardContent className='p-4 sm:p-6'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs sm:text-sm text-primary font-semibold'>Position</span>
          {positionId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => void onReclaim()}
              disabled={isLoading}
              className='h-8 text-xs'
            >
              {isLoading
                ? <Loader2 className='h-3 w-3 animate-spin' />
                : 'Reclaim'}
            </Button>
          )}
        </div>

        {positionId
          ? (
            <div className='space-y-2'>
              <p className='text-xs text-muted-foreground'>
                Active position on server
              </p>
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
          )
          : (
            <p className='text-sm text-muted-foreground'>
              No position open. Enter an amount and click Open Position to deposit into a position note.
            </p>
          )}
      </CardContent>
    </Card>
  );
}
