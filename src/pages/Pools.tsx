import { CreatePoolWizard, readCreatedPools, clearCreatedPools } from '@/components/CreatePoolWizard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { AllDropdown } from '@/components/AllDropdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModalContext } from '@/providers/ModalContext';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function Pools() {
  const modalContext = useContext(ModalContext);
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

  const openCreateWizard = useCallback(() => {
    modalContext.openModal(<CreatePoolWizard onCreated={refreshCreated} />);
  }, [modalContext, refreshCreated]);

  const handleDeleteDrafts = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all draft pools? This cannot be undone.')) {
      clearCreatedPools();
      refreshCreated();
    }
  }, [refreshCreated]);

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
              {createdPools.length > 0 && (
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
              <Button
                size='sm'
                className='rounded-lg bg-primary text-primary-foreground'
                onClick={openCreateWizard}
              >
                Create pool
              </Button>
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
                    Start earning by providing liquidity to pools. Create a pool or browse existing pools to add liquidity.
                  </p>
                  <div className='flex flex-wrap items-center justify-center gap-3'>
                    <Button
                      variant='outline'
                      className='rounded-lg border-muted-foreground/30'
                      onClick={() => navigate('/explore')}
                    >
                      Browse Pools
                    </Button>
                    <Button
                      className='rounded-lg bg-primary text-primary-foreground'
                      onClick={openCreateWizard}
                    >
                      Create Pool
                    </Button>
                  </div>
                </div>
              </Card>
            )
            : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {createdPools.map(p => (
                  <Card key={p.id} className='rounded-xl border bg-card overflow-hidden'>
                    <CardContent className='p-5 space-y-2'>
                      <div className='flex items-center justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='font-semibold truncate'>
                            {p.tokenA.symbol} / {p.tokenB.symbol}
                          </div>
                          <div className='text-xs text-muted-foreground truncate'>
                            {(p.feeBps / 100).toFixed(2)}%
                          </div>
                        </div>
                        <span className='text-xs px-2 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border/60 shrink-0'>
                          Draft
                        </span>
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {p.tokenA.name} · {p.tokenB.name}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
