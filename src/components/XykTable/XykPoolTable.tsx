import { useXykPools } from '@/hooks/useXykPools';
import { accountIdToBech32 } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Droplets } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import XykPoolTableRow from './XykPoolTableRow';

const PAGE_SIZE = 10;

export interface XykPoolTableProps {
  search?: string;
}

const normalize = (s: string) => s.trim().toLowerCase();

const XykPoolTable = ({ search }: XykPoolTableProps) => {
  const { xykPools } = useXykPools();
  const [page, setPage] = useState(0);

  const filteredPools = useMemo(() => {
    const q = normalize(search ?? '');
    if (!q) return xykPools;
    const qNo0x = q.startsWith('0x') ? q.slice(2) : q;
    return xykPools.filter((p) => {
      const bech = accountIdToBech32(p.xykPoolId).toLowerCase();
      const hex = ((p.xykPoolId as unknown as { toHex?: () => string }).toHex?.() ?? '').toLowerCase();
      const hexNo0x = hex.startsWith('0x') ? hex.slice(2) : hex;
      return bech.includes(q) || hex.includes(q) || hexNo0x.includes(qNo0x);
    });
  }, [search, xykPools]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredPools.length / PAGE_SIZE)),
    [filteredPools.length],
  );
  const paginatedPools = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPools.slice(start, start + PAGE_SIZE);
  }, [filteredPools, page]);

  const isEmpty = filteredPools.length === 0;
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className='w-full relative'>
      <Card className='rounded-xl border overflow-hidden'>
        <div className='relative overflow-x-auto'>
          <table className='w-full text-sm text-left text-foreground'>
            <thead>
              <tr className='border-b border-border text-muted-foreground uppercase tracking-wide text-xs'>
                <th className='py-3 px-4 font-medium'>Pool</th>
                <th className='py-3 px-4 font-medium'>TVL ↑</th>
                <th className='py-3 px-4 font-medium'>Price</th>
                <th className='py-3 px-4 font-medium'>APR ↑</th>
                <th className='py-3 px-4 font-medium'>1D VOL ↑</th>
                <th className='py-3 px-4 font-medium'>7D VOL ↑</th>
              </tr>
            </thead>
            <tbody>
              {isEmpty
                ? (
                  <tr>
                    <td colSpan={6} className='py-16 px-6 text-center'>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <div className='h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
                          <Droplets className='h-7 w-7 text-muted-foreground' />
                        </div>
                        <h3 className='text-lg font-semibold text-foreground mb-1'>
                          No XYK pools on registry
                        </h3>
                        <p className='text-sm text-muted-foreground max-w-sm'>
                          XYK pools registered on this chain will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
                : (
                  paginatedPools.map(pool => (
                    <XykPoolTableRow key={accountIdToBech32(pool.xykPoolId)} pool={pool} />
                  ))
                )}
            </tbody>
          </table>
        </div>

        {!isEmpty && totalPages > 1 && (
          <div className='flex items-center justify-between gap-4 py-3 px-4 border-t border-border'>
            <span className='text-sm text-muted-foreground'>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPools.length)} of{' '}
              {filteredPools.length}
            </span>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='rounded-lg h-8 w-8 p-0'
                disabled={!canPrev}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-sm text-muted-foreground min-w-[4rem] text-center'>
                {page + 1} / {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                className='rounded-lg h-8 w-8 p-0'
                disabled={!canNext}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default XykPoolTable;
