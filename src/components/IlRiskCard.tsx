import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function IlRiskCard() {
  return (
    <Card className='rounded-xl border-amber-500/30 bg-amber-500/5'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold flex items-center gap-2'>
          <AlertTriangle className='h-4 w-4 text-amber-600' />
          IL Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>
          This pool&apos;s tokens may have price correlation. Impermanent loss/gain is
          possible when prices move.
        </p>
      </CardContent>
    </Card>
  );
}
