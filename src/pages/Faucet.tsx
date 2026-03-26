import AssetIcon from '@/components/AssetIcon';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import { useClaimNotes } from '@/hooks/useClaimNotes';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

import { ZoroContext } from '@/providers/ZoroContext';
import { type FaucetMintResult, mintFromFaucet } from '@/services/faucet';
import { Loader2 } from 'lucide-react';
import { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface MintStatus {
  readonly isLoading: boolean;
  readonly lastResult: FaucetMintResult | null;
  readonly lastAttempt: number;
  readonly showMessage: boolean;
}

type TokenMintStatuses = Record<string, MintStatus>;

function Faucet() {
  const { connected, address } = useUnifiedWallet();
  const { refreshPendingNotes } = useClaimNotes();
  const [mintStatuses, setMintStatuses] = useState<TokenMintStatuses>(
    {} as TokenMintStatuses,
  );
  const { tokens, tokensLoading, startExpectingNotes } = useContext(ZoroContext);
  const updateMintStatus = useCallback((
    tokenSymbol: string,
    updates: Partial<MintStatus>,
  ): void => {
    setMintStatuses(prev => ({
      ...prev,
      [tokenSymbol]: {
        ...prev[tokenSymbol],
        ...updates,
      },
    }));
  }, []);

  useEffect(() => {
    for (const token of Object.values(tokens)) {
      // init token states
      if (!mintStatuses[token.faucetIdBech32]) {
        // eslint-disable-next-line
        updateMintStatus(token.faucetIdBech32, {
          isLoading: false,
          lastAttempt: 0,
          lastResult: null,
          showMessage: false,
        });
      }
    }
  }, [tokens, mintStatuses, setMintStatuses, updateMintStatus]);

  const requestTokens = useCallback(async (tokenFaucetId: string): Promise<void> => {
    if (!connected || !address) {
      return;
    }
    const token = tokens[tokenFaucetId];
    if (!token || !token.faucetIdBech32) {
      return;
    }
    updateMintStatus(tokenFaucetId, {
      isLoading: true,
      lastAttempt: Date.now(),
      showMessage: false,
    });
    startExpectingNotes();

    try {
      const result = await mintFromFaucet(
        address.split('_')[0],
        token.faucetIdBech32,
      );
      updateMintStatus(tokenFaucetId, {
        isLoading: false,
        lastResult: result,
        showMessage: false,
      });
      // Refresh pending notes count after successful mint (sync with network)
      if (result.success) {
        setTimeout(() => refreshPendingNotes(), 2000);
      }
      setTimeout(() => {
        updateMintStatus(tokenFaucetId, {
          showMessage: true,
        });
      }, 100);
      setTimeout(() => {
        updateMintStatus(tokenFaucetId, {
          showMessage: false,
        });
      }, 5100);
    } catch (error) {
      const errorResult: FaucetMintResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      updateMintStatus(tokenFaucetId, {
        isLoading: false,
        lastResult: errorResult,
        showMessage: false,
      });
      setTimeout(() => {
        updateMintStatus(tokenFaucetId, {
          showMessage: true,
        });
      }, 100);
      setTimeout(() => {
        updateMintStatus(tokenFaucetId, {
          showMessage: false,
        });
      }, 5100);
    }
  }, [connected, address, updateMintStatus, tokens, refreshPendingNotes, startExpectingNotes]);

  const getButtonText = (tokenSymbol: string, status: MintStatus): string => {
    return status.isLoading ? `Minting ${tokenSymbol}...` : `Request ${tokenSymbol}`;
  };

  const isButtonDisabled = (status: MintStatus): boolean => {
    return status.isLoading || !connected;
  };

  if (tokensLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-3 pb-10'>
        <div className='w-full max-w-sm sm:max-w-md space-y-4'>
          <Skeleton className='h-[160px] w-full rounded-xl transition-all duration-400 ease-out opacity-20 border-2 border-orange-200 dark:border-orange-600/75' />
          <Skeleton className='h-[160px] w-full rounded-xl transition-all duration-400 ease-out opacity-20 border-2 border-orange-200 dark:border-orange-600/75' />
        </div>
      </div>
    );
  }

  if (Object.keys(tokens).length === 0) {
    return (
      <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <div className='text-center space-y-4'>
            <div className='text-destructive'>No faucets available</div>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Faucet - ZoroSwap | DeFi on Miden</title>
      <meta name='description' content='Testnet faucet for the Zoro Swap AMM.' />
      <meta property='og:title' content='Faucet - ZoroSwap | DeFi on Miden' />
      <meta property='og:description' content='Testnet faucet for the Zoro Swap AMM.' />
      <meta name='twitter:title' content='Faucet - ZoroSwap | DeFi on Miden' />
      <meta name='twitter:description' content='Testnet faucet for the Zoro Swap AMM.' />
      <Header />
      <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
          <div className='text-center mb-10'>
            <h1 className='text-3xl font-bold font-cal-sans text-foreground mb-2'>
              Testnet Faucet
            </h1>
            <p className='text-sm text-muted-foreground'>
              Request test tokens to start swapping and providing liquidity on Miden testnet.
            </p>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {Object.values(tokens).map((token) => {
              const status = mintStatuses[token.faucetIdBech32];

              if (!token || !status) return null;

              return (
                <Fragment key={token.faucetIdBech32}>
                  <div className='flex flex-col'>
                  <Card
                    className='rounded-xl rounded-b-none border-b-0 transition-all duration-200 hover:border-orange-200/10'
                  >
                    <CardContent className='p-6 sm:p-8 flex gap-2 flex-col items-center'>
                      <AssetIcon symbol={token.symbol} size={48} />
                      <h3 className='text-md sm:text-lg font-semibold'>
                        Test {token.name}
                      </h3>
                      <div className='text-[10px] text-muted-foreground text-center'>
                        {token.faucetIdBech32}
                      </div>
                    </CardContent>
                  </Card>
                  {connected && (
                    <Button
                      onClick={() => requestTokens(token.faucetIdBech32)}
                      disabled={isButtonDisabled(status)}
                      className='w-full h-14 rounded-none rounded-b-xl bg-primary hover:bg-orange-700 text-white text-sm sm:text-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {status.isLoading && (
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      )}
                      {getButtonText(token.symbol, status)}
                    </Button>
                  )}
                  {!connected && (
                    <UnifiedWalletButton className='!font-bold !p-5 w-full !font-semibold !font-sans h-full !rounded-none !rounded-b-xl !text-sm sm:!text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 !border-none !text-center !flex !items-center !justify-center' />
                  )}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      status.lastResult && status.showMessage
                        ? 'max-h-20 opacity-100 mb-3'
                        : 'max-h-0 opacity-0 mb-0'
                    }`}
                  >
                    {status.lastResult && (
                      <div
                        className={`text-xs p-2 rounded-md transform transition-all duration-300 ease-out text-center whitespace-pre-line ${
                          status.showMessage
                            ? 'translate-y-0 scale-100'
                            : '-translate-y-2 scale-95'
                        } ${
                          status.lastResult.success
                            ? 'bg-transparent text-black dark:text-green-300'
                            : 'bg-transparent text-red-800 dark:text-red-200'
                        }`}
                      >
                        {status.lastResult.message}
                        {status.lastResult.transactionId && (
                          <div className='mt-1 font-mono text-xs opacity-75 break-all'>
                            TX: {status.lastResult.transactionId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
          <div className='pt-8 pb-2 sm:pb-0 flex justify-center'>
            <Link to='/'>
              <Button
                variant='secondary'
                size='sm'
                className='text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors'
              >
                ← Back to Swap
              </Button>
            </Link>
          </div>
      </main>
      <Footer />
    </div>
  );
}

export default Faucet;
