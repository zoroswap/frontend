import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MockRecentTx } from '@/mocks/poolDetailMocks';

const TYPE_COLORS: Record<string, string> = {
  Swap: 'text-primary',
  Add: 'text-green-600',
  Remove: 'text-amber-600',
};

export interface RecentTransactionsCardProps {
  transactions: MockRecentTx[];
}

export function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
  return (
    <Card className='rounded-xl'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border text-muted-foreground text-xs uppercase tracking-wide'>
                <th className='text-left py-3 px-4'>Type</th>
                <th className='text-left py-3 px-4'>Amount in</th>
                <th className='text-left py-3 px-4'>Amount out</th>
                <th className='text-left py-3 px-4'>Account</th>
                <th className='text-right py-3 px-4'>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i} className='border-b border-border/50'>
                  <td
                    className={`py-3 px-4 font-medium ${
                      TYPE_COLORS[tx.type] ?? ''
                    }`}
                  >
                    {tx.type}
                  </td>
                  <td className='py-3 px-4'>{tx.amountIn}</td>
                  <td className='py-3 px-4'>{tx.amountOut}</td>
                  <td className='py-3 px-4 font-mono text-muted-foreground'>
                    {tx.account}
                  </td>
                  <td className='py-3 px-4 text-right text-muted-foreground'>
                    {tx.timeAgo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
