import { AllDropdown } from '@/components/AllDropdown';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XykPairIcon } from '@/components/XykPairIcon';
import {
  clearCreatedPools,
  readCreatedPools,
  removeCreatedPool,
} from '@/lib/poolUtils';
import { emptyFn } from '@/lib/shared';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Pools() {
  const navigate = useNavigate();
  const [createdPools, setCreatedPools] = useState(() => readCreatedPools());
  const refreshCreated = useCallback(() => setCreatedPools(readCreatedPools()), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'zoro-created-pools') refreshCreated();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshCreated]);

  const handleDeleteDrafts = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to delete all draft pools? This cannot be undone.',
      )
    ) {
      clearCreatedPools();
      refreshCreated();
    }
  }, [refreshCreated]);

  const handleDeleteDraft = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm('Delete this draft pool? This cannot be undone.')) {
        removeCreatedPool(id);
        refreshCreated();
      }
    },
    [refreshCreated],
  );

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Pools - ZoroSwap | DeFi on Miden</title>
      <Header />
      <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
        <section>
          <div className='flex flex-wrap items-center justify-between gap-4 mb-4'>
            <h2 className='text-2xl font-bold font-cal-sans text-foreground'>
              Your pools
            </h2>
            <div className='flex items-center gap-3'>
              <AllDropdown />
              <AllDropdown />
              {createdPools.some((p) => p.status !== 'deployed') && (
                <Button
                  size='sm'
                  variant='outline'
                  className='rounded-lg text-destructive border-destructive/50 hover:bg-destructive/10'
                  onClick={handleDeleteDrafts}
                >
                  <Trash2 className='h-4 w-4 mr-1' />
                  Delete drafts
                </Button>
              )}
              <Link to='/new-xyk-pool'>
                <Button
                  size='sm'
                  className='rounded-lg bg-primary text-primary-foreground'
                  onClick={emptyFn}
                >
                  Create pool
                </Button>
              </Link>
            </div>
          </div>

          {createdPools.length === 0
            ? (
              <Card className='rounded-xl border border-dashed border-muted-foreground/30 overflow-hidden'>
                <div className='flex flex-col items-center justify-center py-16 px-6 text-center'>
                  <div className='h-16 w-16 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-foreground mb-1'>
                    No pools yet
                  </h3>
                  <p className='text-sm text-muted-foreground max-w-sm mb-6'>
                    Start earning by providing liquidity to pools. Create a pool or browse
                    existing pools to add liquidity.
                  </p>
                  <div className='flex flex-wrap items-center justify-center gap-3'>
                    <Button
                      variant='outline'
                      className='rounded-lg border-muted-foreground/30'
                      onClick={() => navigate('/explore')}
                    >
                      Browse Pools
                    </Button>
                    <Link to='/new-xyk-pool'>
                      <Button
                        size='sm'
                        className='rounded-lg bg-primary text-primary-foreground'
                        onClick={emptyFn}
                      >
                        Create pool
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
            : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {createdPools.map(p => {
                  const isDeployed = p.status === 'deployed' && p.poolIdBech32;
                  const cardContent = (
                    <CardContent className='p-5 space-y-2'>
                      <div className='flex items-center justify-between gap-3'>
                        <div className='min-w-0 flex items-center gap-2'>
                          <XykPairIcon
                            symbolA={p.tokenA.symbol}
                            symbolB={p.tokenB.symbol}
                            size={32}
                          />
                          <div className='min-w-0'>
                            <div className='font-semibold truncate'>
                              {p.tokenA.symbol} / {p.tokenB.symbol}
                            </div>
                            <div className='text-xs text-muted-foreground truncate'>
                              {(p.feeBps / 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          {p.status !== 'deployed' && (
                            <button
                              type='button'
                              onClick={(e) => handleDeleteDraft(p.id, e)}
                              className='p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                              aria-label='Delete draft'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          )}
                          <span className='text-xs px-2 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border/60'>
                            {isDeployed ? 'Pool' : 'Draft'}
                          </span>
                        </div>
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {p.tokenA.name} · {p.tokenB.name}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  );
                  return (
                    <Card
                      key={p.id}
                      className='rounded-xl border bg-card overflow-hidden'
                    >
                      {isDeployed
                        ? (
                          <Link
                            to={`/explore/pool/${encodeURIComponent(p.poolIdBech32!)}`}
                            className='block hover:bg-muted/30 transition-colors'
                          >
                            {cardContent}
                          </Link>
                        )
                        : cardContent}
                    </Card>
                  );
                })}
              </div>
            )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
