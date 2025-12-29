import AssetIcon from '@/components/AssetIcon';
import ExchangeRatio from '@/components/ExchangeRatio';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OrderStatus } from '@/components/OrderStatus';
import { poweredByMiden } from '@/components/PoweredByMiden';
import Price from '@/components/Price';
import Slippage from '@/components/Slippage';
import SwapInputBuy from '@/components/SwapInputBuy';
import SwapPairs from '@/components/SwapPairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBalance } from '@/hooks/useBalance';
import { useSwap } from '@/hooks/useSwap';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import { DEFAULT_SLIPPAGE } from '@/lib/config';
import { OracleContext, useOraclePrices } from '@/providers/OracleContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider.tsx';
import { useWallet, WalletMultiButton } from '@demox-labs/miden-wallet-adapter';
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
  const { orderStatus } = useOrderUpdates();
  const { connecting, connected } = useWallet();
  const [selectedAssetBuy, setSelectedAssetBuy] = useState<undefined | TokenConfig>();
  const [selectedAssetSell, setSelectedAssetSell] = useState<undefined | TokenConfig>();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const { balance: balanceSell, formatted: balanceSellFmt } = useBalance({
    token: selectedAssetSell,
  });
  const { balance: balancebuy, formatted: balanceBuyFmt } = useBalance({
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

  // const setAsset = useCallback((side: 'buy' | 'sell', symbol: string) => {
  //   const asset = Object.values(tokens).find(a => a.symbol === symbol);
  //   if (asset == null) return;
  //   if (side === 'buy') {
  //     if (selectedAssetSell?.symbol === asset.symbol) {
  //       setSelectedAssetSell(selectedAssetBuy);
  //     }
  //     setSelectedAssetBuy(asset);
  //   } else {
  //     if (selectedAssetBuy?.symbol === asset.symbol) {
  //       setSelectedAssetBuy(selectedAssetSell);
  //     }
  //     setSelectedAssetSell(asset);
  //   }
  // }, [selectedAssetBuy, selectedAssetSell, tokens]);

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
      <main className='flex-1 flex items-center justify-center p-3 sm:p-4 -mt-4'>
        <div className='w-full max-w-[495px] space-y-4 sm:space-y-6'>
          {/* Sell Card */}
          <Card className='border rounded-sm sm:rounded-md'>
            <CardContent className='p-3 sm:p-4 space-y-3 sm:space-y-4'>
              <h1 className='sr-only'>Swap Tokens</h1>
              <div className='space-y-2'>
                <div className='flex gap-1 sm:gap-2 justify-between items-center'>
                  <div className='text-xs sm:text-sm text-primary font-medium'>Sell</div>
                  <Slippage slippage={slippage} onSlippageChange={setSlippage} />
                </div>
                <Card className='border-none'>
                  <CardContent className='!sm:px-0 !px-0 p-3 sm:p-4 space-y-2 sm:space-y-3'>
                    <div className='flex items-center justify-between gap-2'>
                      <Input
                        value={stringSell}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder='0'
                        aria-errormessage={sellInputError}
                        className={`border-none text-3xl sm:text-4xl font-light outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner ${
                          sellInputError
                            ? 'text-orange-600 placeholder:text-destructive/50'
                            : ''
                        }`}
                      />
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-auto border-1 rounded-xl px-3 py-2 text-xs sm:text-sm bg-background cursor-default hover:bg-background'
                      >
                        {selectedAssetSell && (
                          <>
                            <AssetIcon symbol={selectedAssetSell.symbol} />
                            {selectedAssetSell.symbol}
                          </>
                        )}
                      </Button>
                    </div>
                    {sellInputError && (
                      <div className='flex items-center justify-between text-xs h-5'>
                        <p className='text-xs text-orange-600'>
                          {sellInputError}
                        </p>
                      </div>
                    )}
                    <div className='flex items-center justify-between text-xs h-5'>
                      <div className='text-muted-foreground'>
                        {rawSell > BigInt(0) && selectedAssetSell && (
                          <>
                            = $
                            <Price amount={rawSell} tokenConfig={selectedAssetSell} />
                          </>
                        )}
                      </div>
                      {accountId && balanceSell !== null && balanceSell !== undefined
                        && (
                          <div className='flex items-center gap-1'>
                            <button
                              onClick={handleMaxClick}
                              disabled={balanceSell === BigInt(0)}
                              className={`hover:text-foreground transition-colors cursor-pointer mr-1 ${
                                sellInputError
                                  ? 'text-orange-600 hover:text-destructive'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {balanceSellFmt} {selectedAssetSell?.symbol ?? ''}
                            </button>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Swap Pairs */}
          <div className='flex justify-center -my-1'>
            <SwapPairs swapPairs={swapPairs} disabled={isLoadingSwap} />
          </div>

          {/* Buy Card */}
          <Card className='border rounded-sm sm:rounded-md'>
            <CardContent className='p-3 sm:p-4 space-y-3 sm:space-y-4'>
              <div className='space-y-2'>
                <div className='text-xs sm:text-sm text-primary font-medium'>Buy</div>
                <Card className='border-none'>
                  <CardContent className='!sm:px-0 !px-0 p-3 sm:p-4 space-y-2 sm:space-y-3'>
                    <div className='flex items-center justify-between gap-2'>
                      <SwapInputBuy
                        amountSell={rawSell}
                        assetBuy={selectedAssetBuy}
                        assetSell={selectedAssetSell}
                      />

                      <Button
                        variant='outline'
                        size='sm'
                        className='h-auto border-1 rounded-xl px-3 py-2 text-xs sm:text-sm bg-background cursor-default hover:bg-background'
                      >
                        {selectedAssetBuy && (
                          <>
                            <AssetIcon symbol={selectedAssetBuy.symbol} />
                            {selectedAssetBuy.symbol}
                          </>
                        )}
                      </Button>
                    </div>
                    <div className='flex items-center justify-end text-xs h-5'>
                      {balancebuy !== null && balancebuy !== undefined && (
                        <div className='text-muted-foreground mr-1'>
                          {balanceBuyFmt} {selectedAssetBuy?.symbol ?? ''}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Main Action Button */}
          <div className='w-full h-8 sm:h-12 mt-4 sm:mt-6'>
            {connected
              ? (
                <Button
                  onClick={onSwap}
                  disabled={connecting || isLoadingSwap || !client
                    || stringSell === '' || !!sellInputError}
                  variant='outline'
                  className={`w-full h-full rounded-xl font-bold text-sm sm:text-lg transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                    buttonText === 'Swap'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
                      : 'hover:border-orange-200/20 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {connecting
                    ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        Connecting...
                      </>
                    )
                    : isLoadingSwap
                    ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        Creating Note...
                      </>
                    )
                    : !client
                    ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      </>
                    )
                    : buttonText}
                </Button>
              )
              : (
                <div className='relative w-full h-full'>
                  {connecting && (
                    <Button
                      disabled
                      variant='outline'
                      className='w-full h-full rounded-xl font-semibold text-sm sm:text-lg transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
                    >
                      <Loader2 className='w-10 h-10 animate-spin' />
                    </Button>
                  )}

                  <div className={connecting ? 'invisible' : 'visible'}>
                    <WalletMultiButton className='!p-5 w-full h-full !font-sans !rounded-xl !font-semibold !text-sm sm:!text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 !border-none !text-center !flex !items-center !justify-center'>
                      Connect Wallet
                    </WalletMultiButton>
                  </div>
                </div>
              )}
          </div>
          <p className='text-xs text-center opacity-40 min-h-6'>
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
          {/* Powered by MIDEN */}
          <div className='flex items-center justify-center'>
            {poweredByMiden}
          </div>
        </div>
      </main>
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
