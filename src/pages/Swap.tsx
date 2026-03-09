import ExchangeRatio from '@/components/ExchangeRatio';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OrderStatus } from '@/components/OrderStatus';
import { poweredByMiden } from '@/components/PoweredByMiden';
import Price from '@/components/Price';
import Slippage from '@/components/Slippage';
import SwapInputBuy from '@/components/SwapInputBuy';
import SwapPairs from '@/components/SwapPairs';
import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import { useBalance } from '@/hooks/useBalance';
import { useSwap } from '@/hooks/useSwap';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { DEFAULT_SLIPPAGE } from '@/lib/config';
import { bech32ToAccountId } from '@/lib/utils';
import { OracleContext, useOraclePrices } from '@/providers/OracleContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider.tsx';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { Loader2 } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { formatUnits, parseUnits } from 'viem';

const validateValue = (val: bigint, max: bigint) => {
  return val > max
    ? 'Amount too large'
    : val === BigInt(0)
    ? "Amount can't be zero"
    : val <= 0
    ? 'Invalid value'
    : undefined;
};

function Swap() {
  const { tokens, client, accountId } = useContext(
    ZoroContext,
  );
  const {
    swap,
    isLoading: isLoadingSwap,
    txId,
    noteId,
  } = useSwap();
  // Subscribe to all order updates from the start
  const { orderStatus, registerCallback } = useOrderUpdates();
  const { connecting, connected } = useUnifiedWallet();
  const [selectedAssetBuy, setSelectedAssetBuy] = useState<undefined | TokenConfig>(
    () => getLocalStoredToken('buy'),
  );
  const [selectedAssetSell, setSelectedAssetSell] = useState<undefined | TokenConfig>(
    () => getLocalStoredToken('sell'),
  );
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const {
    balance: balanceSell,
    formattedLong: balanceSellFmt,
    refetch: refetchBalanceSell,
  } = useBalance({
    token: selectedAssetSell,
  });
  const {
    balance: balancebuy,
    formattedLong: balanceBuyFmt,
  } = useBalance({
    token: selectedAssetBuy,
  });

  const [rawSell, setRawSell] = useState<bigint>(BigInt(0));
  const [rawBuy, setRawBuy] = useState<bigint>(BigInt(0));
  const [slippage, setSlippage] = useState<number>(DEFAULT_SLIPPAGE);
  const [stringSell, setStringSell] = useState<string | undefined>('');
  const [sellInputError, setSellInputError] = useState<string | undefined>(undefined);
  const { getWebsocketPrice } = useContext(OracleContext);

  const priceIds = useMemo(() => [
    ...(selectedAssetBuy?.oracleId ? [selectedAssetBuy.oracleId] : []),
    ...(selectedAssetSell?.oracleId ? [selectedAssetSell.oracleId] : []),
  ], [selectedAssetBuy?.oracleId, selectedAssetSell?.oracleId]);

  const prices = useOraclePrices(priceIds);
  useEffect(() => {
    if (!selectedAssetBuy && !selectedAssetSell && tokens) {
      setSelectedAssetSell(Object.values(tokens)[0]);
      setSelectedAssetBuy(Object.values(tokens)[1]);
    }
  }, [tokens, selectedAssetBuy, selectedAssetSell]);

  const setAsset = useCallback((side: 'buy' | 'sell', faucetIdBech32: string) => {
    const asset = Object.values(tokens).find(a => a.faucetIdBech32 === faucetIdBech32);
    if (asset == null) return;
    if (side === 'buy') {
      if (selectedAssetSell?.symbol === asset.symbol) {
        setSelectedAssetSell(selectedAssetBuy);
        setLocalStoredToken('sell', selectedAssetBuy);
      }
      setSelectedAssetBuy(asset);
      setLocalStoredToken('buy', asset);
    } else {
      if (selectedAssetBuy?.symbol === asset.symbol) {
        setSelectedAssetBuy(selectedAssetSell);
        setLocalStoredToken('buy', selectedAssetSell);
      }

      setSelectedAssetSell(asset);
      setLocalStoredToken('sell', asset);
    }
  }, [selectedAssetBuy, selectedAssetSell, tokens]);

  const onInputChange = useCallback((val: string) => {
    val = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const setError = setSellInputError;
    const decimalsSell = selectedAssetSell?.decimals || 6;
    if (!selectedAssetBuy || !selectedAssetSell) {
      return;
    }

    setStringSell(val);
    if (val === '' || val === '.') {
      setError(undefined);
      setRawSell(BigInt(0));
      return;
    }
    const newSell = parseUnits(val, decimalsSell);
    const validationError = validateValue(newSell, balanceSell ?? BigInt(0));
    if (validationError) {
      setError(validationError);
    } else {
      setError(undefined);
      setRawSell(newSell);
    }
  }, [
    selectedAssetBuy,
    selectedAssetSell,
    balanceSell,
    setStringSell,
    setRawSell,
    setSellInputError,
  ]);

  const clearForm = useCallback(() => {
    setSellInputError(undefined);
    setRawSell(BigInt(0));
    setStringSell('');
  }, [
    setSellInputError,
    setRawSell,
    setStringSell,
  ]);

  useEffect(() => {
    onInputChange(stringSell ?? '');
  }, [prices, onInputChange, stringSell]);

  const swapPairs = useCallback(() => {
    const newAssetSell = selectedAssetBuy;
    const newAssetBuy = selectedAssetSell;
    setSelectedAssetBuy(newAssetBuy);
    setSelectedAssetSell(newAssetSell);
  }, [
    selectedAssetBuy,
    selectedAssetSell,
  ]);

  useEffect(() => {
    if (noteId) {
      registerCallback(noteId, status => {
        if (status === 'pending') {
          refetchBalanceSell();
        }
      });
    }
  }, [noteId, registerCallback, refetchBalanceSell]);

  const onSwap = useCallback(() => {
    if (!selectedAssetBuy || !selectedAssetSell) {
      return;
    }
    // Calculate minimum output with slippage protection
    // minAmountOut = rawBuy * (1 - slippage/100)
    const slippageFactor = BigInt(Math.round((100 - slippage) * 1e6));

    const priceA = getWebsocketPrice(selectedAssetBuy.oracleId);
    const priceB = getWebsocketPrice(selectedAssetSell.oracleId);

    const ratio = Number(priceB?.priceFeed.value ?? 0)
      / Number(priceA?.priceFeed.value ?? 1);

    const rawBuy = BigInt(Math.floor((ratio ?? 1) * 1e12)) * rawSell
      / BigInt(10 ** (selectedAssetBuy.decimals - selectedAssetSell.decimals + 12));

    const minAmountOut = rawBuy * slippageFactor / BigInt(1e8);
    swap({
      amount: rawSell,
      minAmountOut,
      buyToken: selectedAssetBuy,
      sellToken: selectedAssetSell,
    });
    setRawBuy(rawBuy);
  }, [rawSell, slippage, selectedAssetBuy, selectedAssetSell, swap, getWebsocketPrice]);

  const handleMaxClick = useCallback(() => {
    onInputChange(
      formatUnits(balanceSell || BigInt(0), selectedAssetSell?.decimals || 6),
    );
  }, [onInputChange, balanceSell, selectedAssetSell?.decimals]);

  const buttonText = useMemo(() => {
    const showInsufficientBalance = Boolean(
      rawSell > (balanceSell || BigInt(0)),
    );
    if (showInsufficientBalance) {
      return `Insufficient ${selectedAssetSell?.symbol} balance`;
    } else return 'Swap';
  }, [
    rawSell,
    balanceSell,
    selectedAssetSell?.symbol,
  ]);

  const lastShownNoteId = useRef<string | undefined>(undefined);

  const onCloseSuccessModal = useCallback(() => {
    clearForm();
    setIsSuccessModalOpen(false);
  }, [clearForm]);

  useEffect(() => {
    if (noteId && noteId !== lastShownNoteId.current) {
      lastShownNoteId.current = noteId;
      setIsSuccessModalOpen(true);
      // Note: Already subscribed to all orders in useOrderUpdates([])
    }
  }, [noteId]);

  // Handle order status updates, show toast on failure
  useEffect(() => {
    if (noteId && orderStatus[noteId]?.status === 'failed') {
      toast.error('Swap order failed');
    }
  }, [noteId, orderStatus]);

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col relative dotted-bg'>
      <title>Swap - ZoroSwap | DeFi on Miden</title>
      <meta property='og:title' content='Swap - ZoroSwap | DeFi on Miden' />
      <meta name='twitter:title' content='Swap - ZoroSwap | DeFi on Miden' />
      <Header />
      <main className='flex-1 flex items-start justify-center p-4 sm:p-6 pt-8 sm:pt-12'>
        <div className='w-full max-w-[580px]'>
          <h1 className='sr-only'>Swap Tokens</h1>

          {/* Settings gear - top right, relative so dropdown aligns to full width */}
          <div className='relative flex justify-end mb-1'>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>

          {/* Sell Card — white bg, border, no shadow */}
          <Card className='border border-border/60 rounded-2xl bg-white shadow-none'>
            <CardContent className='p-6 sm:p-8'>
              <div className='text-sm text-primary font-semibold mb-4'>Sell</div>
              <div className='flex items-center justify-between gap-4 mb-4'>
                <Input
                  value={stringSell ?? ''}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder='0'
                  aria-errormessage={sellInputError}
                  className={`border-none bg-transparent text-5xl sm:text-6xl font-semibold text-foreground outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner placeholder:text-foreground/70 ${
                    sellInputError
                      ? 'text-orange-600 placeholder:text-destructive/50'
                      : ''
                  }`}
                />
                <div className='relative'>
                  <TokenAutocomplete
                    tokens={Object.values(tokens)}
                    value={selectedAssetSell}
                    onChange={(id) => setAsset('sell', id)}
                    excludeFaucetIdBech32={selectedAssetBuy?.faucetIdBech32}
                  />
                </div>
              </div>
              {sellInputError && (
                <p className='text-xs text-orange-600 mb-2'>
                  {sellInputError}
                </p>
              )}
              <div>
                <div className='flex items-center justify-between text-sm'>
                  <div className='text-muted-foreground font-medium'>
                    {rawSell > BigInt(0) && selectedAssetSell
                      ? (
                        <>
                          $<Price amount={rawSell} tokenConfig={selectedAssetSell} />
                        </>
                      )
                      : '$0'}
                  </div>
                  {accountId && balanceSell !== null && balanceSell !== undefined
                    && (
                      <button
                        onClick={handleMaxClick}
                        disabled={balanceSell === BigInt(0)}
                        className={`hover:text-foreground transition-colors cursor-pointer ${
                          sellInputError
                            ? 'text-orange-600 hover:text-destructive'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {balanceSellFmt} {selectedAssetSell?.symbol ?? ''}
                      </button>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swap Pairs */}
          <div className='flex justify-center -my-7 relative z-10'>
            <div className='bg-white rounded-xl p-1'>
              <SwapPairs swapPairs={swapPairs} disabled={isLoadingSwap} />
            </div>
          </div>

          {/* Buy Card — gray bg, no border, no shadow */}
          <Card className='border-0 rounded-2xl bg-[hsl(0,0%,95%)] shadow-none'>
            <CardContent className='p-6 sm:p-8 pb-10 sm:pb-12'>
              <div className='text-sm text-primary font-semibold mb-4'>Sell</div>
              <div className='flex items-center justify-between gap-4'>
                <SwapInputBuy
                  amountSell={rawSell}
                  assetBuy={selectedAssetBuy}
                  assetSell={selectedAssetSell}
                />
                <div className='relative'>
                  <TokenAutocomplete
                    tokens={Object.values(tokens)}
                    value={selectedAssetBuy}
                    onChange={(id) => setAsset('buy', id)}
                    excludeFaucetIdBech32={selectedAssetSell?.faucetIdBech32}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Action Button */}
          <div className='w-full mt-4 sm:mt-5'>
            {connected
              ? (
                <Button
                  onClick={onSwap}
                  disabled={connecting || isLoadingSwap || !client
                    || stringSell === '' || !!sellInputError}
                  variant='outline'
                  className={`w-full h-14 sm:h-16 rounded-2xl font-bold text-base sm:text-xl transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                    buttonText === 'Swap'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
                      : 'hover:border-orange-200/20 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {connecting
                    ? (
                      <>
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                        Connecting...
                      </>
                    )
                    : isLoadingSwap
                    ? (
                      <>
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                        Creating Note...
                      </>
                    )
                    : !client
                    ? (
                      <>
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                      </>
                    )
                    : buttonText}
                </Button>
              )
              : (
                <div className='relative w-full'>
                  {connecting && (
                    <Button
                      disabled
                      variant='outline'
                      className='w-full h-14 sm:h-16 rounded-2xl font-semibold text-base sm:text-xl transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
                    >
                      <Loader2 className='w-10 h-10 animate-spin' />
                    </Button>
                  )}

                  <div className={connecting ? 'invisible' : 'visible'}>
                    <UnifiedWalletButton className='!p-5 w-full !h-14 sm:!h-16 !font-sans !rounded-2xl !font-bold !text-base sm:!text-xl !bg-primary !text-primary-foreground hover:!bg-primary/90 !border-none !text-center !flex !items-center !justify-center' />
                  </div>
                </div>
              )}
          </div>
          <p className='text-xs text-center opacity-40 mt-3'>
            {selectedAssetBuy && selectedAssetSell
              ? (
                <span>
                  1 {selectedAssetSell.symbol} ={' '}
                  <ExchangeRatio assetA={selectedAssetSell} assetB={selectedAssetBuy} />
                  {' '}
                  {selectedAssetBuy.symbol}
                </span>
              )
              : null}
          </p>
        </div>
      </main>
      <div className='flex items-center justify-center py-6'>
        {poweredByMiden}
      </div>
      <Footer />
      {isSuccessModalOpen && (
        <OrderStatus
          onClose={onCloseSuccessModal}
          swapResult={{ txId, noteId }}
          swapDetails={{
            sellToken: selectedAssetSell,
            buyToken: selectedAssetBuy,
            sellAmount: rawSell,
            buyAmount: rawBuy,
          }}
          orderStatus={noteId ? orderStatus[noteId]?.status : undefined}
          title='Swap order'
        />
      )}
    </div>
  );
}

export default Swap;

const getLocalStoredToken = (side: 'buy' | 'sell'): TokenConfig | undefined => {
  const item = localStorage.getItem('swap-' + side);
  if (!item) return undefined;
  try {
    const parsed = JSON.parse(item) as Partial<TokenConfig> & { faucetIdBech32?: string };
    const bech32 = parsed.faucetIdBech32;
    if (typeof bech32 !== 'string' || bech32.trim() === '') return undefined;
    const faucetId = bech32ToAccountId(bech32);
    if (!faucetId) return undefined;
    return {
      symbol: parsed.symbol ?? '?',
      name: parsed.name ?? '?',
      decimals: typeof parsed.decimals === 'number' ? parsed.decimals : 6,
      faucetId,
      faucetIdBech32: bech32,
      oracleId: typeof parsed.oracleId === 'string' ? parsed.oracleId : '',
    } as TokenConfig;
  } catch {
    return undefined;
  }
};
const setLocalStoredToken = (side: 'buy' | 'sell', token?: TokenConfig) => {
  if (token) {
    localStorage.setItem('swap-' + side, JSON.stringify({
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      faucetIdBech32: token.faucetIdBech32,
      oracleId: token.oracleId,
    }));
  }
};
