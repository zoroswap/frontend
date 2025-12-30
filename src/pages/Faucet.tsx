import AssetIcon from '@/components/AssetIcon';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { accountIdToBech32 } from '@/lib/utils';
import { ZoroContext } from '@/providers/ZoroContext';
import { type FaucetMintResult, mintFromFaucet } from '@/services/faucet';
import { useWallet } from '@demox-labs/miden-wallet-adapter';
import { WalletMultiButton } from '@demox-labs/miden-wallet-adapter';
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
  const { connected } = useWallet();
  const [mintStatuses, setMintStatuses] = useState<TokenMintStatuses>(
    {} as TokenMintStatuses,
  );
  const { tokens, tokensLoading, accountId } = useContext(ZoroContext);
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
    if (!connected || !accountId) {
      return;
    }
    const token = tokens[tokenFaucetId];
    if (!token || !token.faucetId) {
      return;
    }
    const faucetId = token.faucetId;
    updateMintStatus(tokenFaucetId, {
      isLoading: true,
      lastAttempt: Date.now(),
      showMessage: false,
    });

    try {
      const result = await mintFromFaucet(
        accountIdToBech32(accountId),
        accountIdToBech32(faucetId),
      );
      updateMintStatus(tokenFaucetId, {
        isLoading: false,
        lastResult: result,
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
  }, [connected, accountId, updateMintStatus, tokens]);

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
      <main className='flex-1 flex items-center justify-center p-3'>
        <div className='w-full max-w-[495px]'>
          <div>
            {Object.values(tokens).map((token, index) => {
              const status = mintStatuses[token.faucetIdBech32];

              if (!token || !status) return null;
              const lineBetween = index > 0
                ? <div className='border border-bottom-0 border-dashed my-6 opacity-50' />
                : null;

              return (
                <Fragment key={token.faucetId.toString()}>
                  {lineBetween}
                  <Card
                    key={token.symbol}
                    className='rounded-xl transition-all duration-200 hover:border-orange-200/10 mb-4'
                  >
                    <CardContent className='p-4 sm:p-6 flex gap-1 flex-col items-center'>
                      <AssetIcon symbol={token.symbol} />
                      <h3 className='text-md sm:text-lg font-semibold'>
                        Test {token.name}
                      </h3>
                      <div className='text-xs text-muted-foreground overflow-hidden'>
                        <span className='hidden sm:inline'>
                          {accountIdToBech32(token.faucetId)}
                        </span>
                        <span className='sm:hidden break-all'>
                          {accountIdToBech32(token.faucetId)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  {connected && (
                    <Button
                      onClick={() => requestTokens(token.faucetIdBech32)}
                      disabled={isButtonDisabled(status)}
                      className='w-full h-8 sm:h-12 bg-primary hover:bg-orange-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {status.isLoading && (
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      )}
                      {getButtonText(token.symbol, status)}
                    </Button>
                  )}
                  {!connected && (
                    <WalletMultiButton className='!font-bold !p-5 w-full !font-semibold !font-sans h-full !rounded-xl !text-sm sm:!text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 !border-none !text-center !flex !items-center !justify-center'>
                      Connect
                    </WalletMultiButton>
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
                        className={`text-xs p-2 rounded-md transform transition-all duration-300 ease-out text-center ${
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
                </Fragment>
              );
            })}
          </div>
          <div className='pt-8 pb-2 sm:pb-0 flex sm:justify-start justify-center sm:items-start'>
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
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Faucet;
