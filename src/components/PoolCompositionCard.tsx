import AssetIcon from '@/components/AssetIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PoolCompositionCardProps {
  symbol: string;
}

export function PoolCompositionCard({ symbol }: PoolCompositionCardProps) {
  return (
    <Card className='rounded-xl'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>Pool Composition</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <AssetIcon symbol={symbol} size={24} />
            <span>{symbol}</span>
          </div>
          <div className='text-right'>
            <p className='font-medium'>—</p>
            <p className='text-xs text-muted-foreground'>Single-sided</p>
          </div>
        </div>
        <p className='text-xs text-muted-foreground'>
          hfAMM pools are single-sided.
        </p>
      </CardContent>
    </Card>
  );
}
