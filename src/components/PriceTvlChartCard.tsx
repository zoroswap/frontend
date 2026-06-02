import { TradingViewCandlesChart } from '@/components/TradingViewCandlesChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MockCandle } from '@/mocks/poolDetailMocks';

export type ChartRange = '1D' | '1W' | '1M' | 'ALL';

export interface PriceTvlChartCardProps {
  candles: MockCandle[];
  chartRange: ChartRange;
  onChartRangeChange: (range: ChartRange) => void;
}

export function PriceTvlChartCard({
  candles,
  chartRange,
  onChartRangeChange,
}: PriceTvlChartCardProps) {
  return (
    <Card className='rounded-xl'>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <CardTitle className='text-base font-semibold'>Price & TVL</CardTitle>
        <div className='flex gap-1'>
          {(['1D', '1W', '1M', 'ALL'] as const).map((r) => (
            <Button
              key={r}
              variant={chartRange === r ? 'default' : 'ghost'}
              size='sm'
              className='rounded-md h-8'
              onClick={() => onChartRangeChange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className='rounded-lg overflow-hidden border border-border/60'>
          <TradingViewCandlesChart candles={candles} height={256} />
        </div>
      </CardContent>
    </Card>
  );
}
