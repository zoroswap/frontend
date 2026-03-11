import AssetIcon from '@/components/AssetIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prettyBigintFormat } from '@/lib/format';

export interface PoolCompositionCardHfProps {
  variant: 'hf';
  symbol: string;
}

export interface PoolCompositionCardXykProps {
  variant: 'xyk';
  token0Symbol: string;
  token1Symbol: string;
  reserve0: bigint;
  reserve1: bigint;
  decimals0: number;
  decimals1: number;
}

export type PoolCompositionCardProps =
  | PoolCompositionCardHfProps
  | PoolCompositionCardXykProps;

export function PoolCompositionCard(props: PoolCompositionCardProps) {
  return (
    <Card className='rounded-xl'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>Pool Composition</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {props.variant === 'hf' ? (
          <>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={props.symbol} size={24} />
                <span>{props.symbol}</span>
              </div>
              <div className='text-right'>
                <p className='font-medium'>—</p>
                <p className='text-xs text-muted-foreground'>Single-sided</p>
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              hfAMM pools are single-sided.
            </p>
          </>
        ) : (
          <>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={props.token0Symbol} size={24} />
                <span>{props.token0Symbol}</span>
              </div>
              <div className='text-right'>
                <p className='font-medium'>
                  {prettyBigintFormat({
                    value: props.reserve0,
                    expo: props.decimals0,
                  })}
                </p>
                <p className='text-xs text-muted-foreground'>—</p>
              </div>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AssetIcon symbol={props.token1Symbol} size={24} />
                <span>{props.token1Symbol}</span>
              </div>
              <div className='text-right'>
                <p className='font-medium'>
                  {prettyBigintFormat({
                    value: props.reserve1,
                    expo: props.decimals1,
                  })}
                </p>
                <p className='text-xs text-muted-foreground'>—</p>
              </div>
            </div>
            {(() => {
              const total = props.reserve0 + props.reserve1;
              const reserve0Pct =
                total > 0n
                  ? Number((props.reserve0 * 100n) / total)
                  : 50;
              const reserve1Pct =
                total > 0n
                  ? Number((props.reserve1 * 100n) / total)
                  : 50;
              return (
                <>
                  <div className='h-2 rounded-full bg-muted overflow-hidden flex'>
                    <div
                      className='h-full bg-primary/80 rounded-l-full'
                      style={{ width: `${reserve0Pct}%` }}
                    />
                    <div
                      className='h-full bg-blue-400/80'
                      style={{ width: `${reserve1Pct}%` }}
                    />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {total > 0n
                      ? `${props.token0Symbol} ${reserve0Pct}% · ${props.token1Symbol} ${reserve1Pct}%`
                      : '—'}
                  </p>
                </>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
