import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PoolDetailStatsProps {
  /** Main stat value (e.g. TVL or LP supply). */
  tvlFormatted: string;
  /** Main stat label (e.g. "Total Value Locked" or "Total LP Supply"). */
  mainLabel?: string;
  /** Optional first card: label (e.g. "Price"). */
  priceLabel?: string;
  /** Optional first card: value (e.g. "1 ETH = 2000 USDC"). */
  priceValue?: string;
  /** HF only: saturation percentage. When null, the Saturation card is not rendered. */
  saturationPercent?: number | null;
  saturationColorClass?: string;
}

function getSaturationColorClass(pct: number): string {
  if (pct < 15 || pct > 185) return 'text-red-600 border-red-600/30 bg-red-500/10';
  if ((pct >= 15 && pct < 30) || (pct >= 170 && pct <= 185)) {
    return 'text-yellow-600 border-yellow-600/30 bg-yellow-500/10';
  }
  if (pct >= 30 && pct < 170) return 'text-green-600 border-green-600/30 bg-green-500/10';
  return 'text-muted-foreground border-border bg-muted/30';
}

export function PoolDetailStats({
  tvlFormatted,
  mainLabel = 'Total Value Locked',
  priceLabel,
  priceValue,
  saturationPercent = null,
  saturationColorClass,
}: PoolDetailStatsProps) {
  const saturationColor =
    saturationColorClass ??
    (saturationPercent != null ? getSaturationColorClass(saturationPercent) : '');

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-8'>
      {priceLabel != null && priceValue != null && (
        <Card className='rounded-xl'>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
              {priceLabel}
            </p>
            <p className='text-lg font-semibold'>{priceValue}</p>
          </CardContent>
        </Card>
      )}
      <Card className='rounded-xl'>
        <CardContent className='p-4'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
            {mainLabel}
          </p>
          <p className='text-lg font-semibold'>{mainLabel === 'Total Value Locked' ? `$${tvlFormatted}` : tvlFormatted}</p>
        </CardContent>
      </Card>
      {saturationPercent != null && (
        <Card className='rounded-xl'>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>
              Saturation
            </p>
            <p className='text-lg font-semibold'>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md border text-sm font-medium',
                  saturationColor,
                )}
                title='reserve / total liabilities'
              >
                {saturationPercent.toFixed(2)}%
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
