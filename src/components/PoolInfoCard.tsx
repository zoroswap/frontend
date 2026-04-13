import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PoolInfoRow {
  label: string;
  value: React.ReactNode;
}

export interface PoolInfoCardProps {
  tvlFormatted: string;
  /** First row label (e.g. "Total Liquidity" or "Total LP Supply"). */
  firstRowLabel?: string;
  /** Whether first row value is prefixed with $. */
  firstRowIsUsd?: boolean;
  /** Extra rows (e.g. HF: Total Liabilities, Reserve). */
  extraRows?: PoolInfoRow[];
}

export function PoolInfoCard({
  tvlFormatted,
  firstRowLabel = 'Total Liquidity',
  firstRowIsUsd = true,
  extraRows = [],
}: PoolInfoCardProps) {
  return (
    <Card className='rounded-xl'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>Pool Info</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>{firstRowLabel}</span>
          <span>{firstRowIsUsd ? `$${tvlFormatted}` : tvlFormatted}</span>
        </div>
        {extraRows.map((row, i) => (
          <div key={i} className='flex justify-between'>
            <span className='text-muted-foreground'>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
