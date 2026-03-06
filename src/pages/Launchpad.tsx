import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import { useClaimNotes } from '@/hooks/useClaimNotes';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

import { ZoroContext } from '@/providers/ZoroContext';
import { type FaucetMintResult, mintFromFaucet } from '@/services/faucet';
import { useCallback, useContext, useEffect, useState } from 'react';
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
  }, [
    connected,
    address,
    updateMintStatus,
    tokens,
    refreshPendingNotes,
    startExpectingNotes,
  ]);

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
            <Skeleton className='h-[160px] w-full rounded-xl transition-all duration-400 ease-out opacity-20 border-2 border-orange-200 dark:border-orange-600/75' />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Launchpad - ZoroSwap | DeFi on Miden</title>
      <meta name='description' content='Testnet faucet for the Zoro Swap AMM.' />
      <meta property='og:title' content='Faucet - ZoroSwap | DeFi on Miden' />
      <meta property='og:description' content='Testnet faucet for the Zoro Swap AMM.' />
      <meta name='twitter:title' content='Faucet - ZoroSwap | DeFi on Miden' />
      <meta name='twitter:description' content='Testnet faucet for the Zoro Swap AMM.' />
      <Header />
      <main className='flex-1 flex items-center justify-center p-3'>
        <div className='w-full max-w-[495px]'>
          <div className='card'>
            <h1>Token launchpad</h1>
            <form>
              <input name='symbol' type='text' maxLength={6} minLength={3} />
              <input name='decimals' type='number' min='0' max='12' />
              <input name='totalSupply' type='number' min='0' max='' />
              <button>Launch token</button>
            </form>
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
