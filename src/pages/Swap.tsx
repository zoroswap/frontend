import AssetIcon from '@/components/AssetIcon';
import ExchangeRatio from '@/components/ExchangeRatio';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
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
import { formalBigIntFormat, truncateId } from '@/lib/format';
import { bech32ToAccountId } from '@/lib/utils';
import { OracleContext, useOraclePrices } from '@/providers/OracleContext';
import { ZoroContext } from '@/providers/ZoroContext';
import { type TokenConfig } from '@/providers/ZoroProvider.tsx';
import { CheckCircle, Clock, ExternalLink, Loader2, X, XCircle } from 'lucide-react';
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

function hasOracle(token: TokenConfig | undefined): boolean {
  return !!token?.oracleId && token.oracleId !== '0x' && token.oracleId !== '';
}

interface SwapTxInfo {
  noteId: string;
  txId?: string;
  sellToken: TokenConfig;
  buyToken: TokenConfig;
  sellAmount: bigint;
  buyAmount: bigint;
}

function Swap() {
  const { tokens, client, accountId } = useContext(ZoroContext);
  const {
    swap: hfAmmSwap,
    isLoading: isLoadingSwap,
    txId: hfAmmTxId,
    noteId: hfAmmNoteId,
  } = useSwap();
  const { orderStatus, registerCallback } = useOrderUpdates();
  const { connecting, connected } = useUnifiedWallet();

  const [txInfo, setTxInfo] = useState<SwapTxInfo | null>(null);

  const lastHfAmmNoteRef = useRef<string | undefined>(undefined);
  const lastSellRef = useRef<
    { token: TokenConfig; buy: TokenConfig; sellAmt: bigint; buyAmt: bigint } | null
  >(null);

  const allTokens = useMemo(() => {
    return Object.values(tokens);
  }, [tokens]);

  const [selectedAssetBuy, setSelectedAssetBuy] = useState<undefined | TokenConfig>(
    () => getLocalStoredToken('buy'),
  );
  const [selectedAssetSell, setSelectedAssetSell] = useState<undefined | TokenConfig>(
    () => getLocalStoredToken('sell'),
  );
  const {
    balance: balanceSell,
    formattedLong: balanceSellFmt,
    refetch: refetchBalanceSell,
  } = useBalance({
    token: selectedAssetSell,
  });
  useBalance({
    token: selectedAssetBuy,
  });

  const [rawSell, setRawSell] = useState<bigint>(BigInt(0));
  const [, setRawBuy] = useState<bigint>(BigInt(0));
  const [slippage, setSlippage] = useState<number>(DEFAULT_SLIPPAGE);
  const [stringSell, setStringSell] = useState<string | undefined>('');
  const [sellInputError, setSellInputError] = useState<string | undefined>(undefined);
  const { getWebsocketPrice } = useContext(OracleContext);

  const hfAmmBech32s = useMemo(() => {
    const s = new Set<string>();
    for (const t of allTokens) {
      if (hasOracle(t)) s.add(t.faucetIdBech32);
    }
    return s;
  }, [allTokens]);

  const buyDisabled = useMemo(() => {
    if (!selectedAssetSell) return new Set<string>();
    const sellBech32 = selectedAssetSell.faucetIdBech32;

    const disabled = new Set<string>();
    for (const t of allTokens) {
      if (t.faucetIdBech32 === sellBech32) continue;
      if (!hasOracle(t)) disabled.add(t.faucetIdBech32);
    }
    return disabled;
  }, [selectedAssetSell, allTokens]);

  const priceIds = useMemo(() => [
    ...(selectedAssetBuy?.oracleId ? [selectedAssetBuy.oracleId] : []),
    ...(selectedAssetSell?.oracleId ? [selectedAssetSell.oracleId] : []),
  ], [selectedAssetBuy?.oracleId, selectedAssetSell?.oracleId]);

  const prices = useOraclePrices(priceIds);

  useEffect(() => {
    if (!selectedAssetBuy && !selectedAssetSell && allTokens.length > 0) {
      setSelectedAssetSell(allTokens[0]);
      setSelectedAssetBuy(allTokens[1]);
    }
  }, [allTokens, selectedAssetBuy, selectedAssetSell]);

  const canPair = useCallback((a: TokenConfig, b: TokenConfig) => {
    if (a.faucetIdBech32 === b.faucetIdBech32) return false;
    return hasOracle(a) && hasOracle(b);
  }, []);

  const setAsset = useCallback((side: 'buy' | 'sell', faucetIdBech32: string) => {
    const asset = allTokens.find(a => a.faucetIdBech32 === faucetIdBech32);
    if (asset == null) return;
    if (side === 'buy') {
      if (selectedAssetSell?.faucetIdBech32 === asset.faucetIdBech32) {
        setSelectedAssetSell(selectedAssetBuy);
        setLocalStoredToken('sell', selectedAssetBuy);
      }
      setSelectedAssetBuy(asset);
      setLocalStoredToken('buy', asset);
    } else {
      if (selectedAssetBuy?.faucetIdBech32 === asset.faucetIdBech32) {
        setSelectedAssetBuy(selectedAssetSell);
        setLocalStoredToken('buy', selectedAssetSell);
      } else if (selectedAssetBuy && !canPair(asset, selectedAssetBuy)) {
        setSelectedAssetBuy(undefined);
        setLocalStoredToken('buy', undefined);
      }
      setSelectedAssetSell(asset);
      setLocalStoredToken('sell', asset);
    }
  }, [selectedAssetBuy, selectedAssetSell, allTokens, canPair]);

  const onInputChange = useCallback((val: string) => {
    val = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const decimalsSell = selectedAssetSell?.decimals || 6;
    if (!selectedAssetBuy || !selectedAssetSell) {
      return;
    }

    setStringSell(val);
    if (val === '' || val === '.') {
      setSellInputError(undefined);
      setRawSell(BigInt(0));
      return;
    }
    const newSell = parseUnits(val, decimalsSell);
    const validationError = validateValue(newSell, balanceSell ?? BigInt(0));
    if (validationError) {
      setSellInputError(validationError);
    } else {
      setSellInputError(undefined);
      setRawSell(newSell);
    }
  }, [selectedAssetBuy, selectedAssetSell, balanceSell]);

  const clearForm = useCallback(() => {
    setSellInputError(undefined);
    setRawSell(BigInt(0));
    setStringSell('');
  }, []);

  useEffect(() => {
    onInputChange(stringSell ?? '');
  }, [prices, onInputChange, stringSell]);

  const swapPairs = useCallback(() => {
    const newAssetSell = selectedAssetBuy;
    const newAssetBuy = selectedAssetSell;
    setSelectedAssetBuy(newAssetBuy);
    setSelectedAssetSell(newAssetSell);
  }, [selectedAssetBuy, selectedAssetSell]);

  useEffect(() => {
    if (hfAmmNoteId && hfAmmNoteId !== lastHfAmmNoteRef.current && lastSellRef.current) {
      lastHfAmmNoteRef.current = hfAmmNoteId;
      const s = lastSellRef.current;
      setTxInfo({
        noteId: hfAmmNoteId,
        txId: hfAmmTxId,
        sellToken: s.token,
        buyToken: s.buy,
        sellAmount: s.sellAmt,
        buyAmount: s.buyAmt,
      });
    }
  }, [hfAmmNoteId, hfAmmTxId]);

  useEffect(() => {
    if (hfAmmNoteId) {
      registerCallback(hfAmmNoteId, status => {
        if (status === 'pending') {
          refetchBalanceSell();
        }
      });
    }
  }, [hfAmmNoteId, registerCallback, refetchBalanceSell]);

  useEffect(() => {
    if (txInfo && orderStatus[txInfo.noteId]?.status === 'failed') {
      toast.error('Swap order failed');
    }
  }, [txInfo, orderStatus]);

  const onSwap = useCallback(() => {
    if (!selectedAssetBuy || !selectedAssetSell) return;

    const slippageFactor = BigInt(Math.round((100 - slippage) * 1e6));
    const priceA = getWebsocketPrice(selectedAssetBuy.oracleId);
    const priceB = getWebsocketPrice(selectedAssetSell.oracleId);
    const ratio = Number(priceB?.priceFeed.value ?? 0)
      / Number(priceA?.priceFeed.value ?? 1);
    const computedBuy = BigInt(Math.floor((ratio ?? 1) * 1e12)) * rawSell
      / BigInt(10 ** (selectedAssetBuy.decimals - selectedAssetSell.decimals + 12));
    const minAmountOut = computedBuy * slippageFactor / BigInt(1e8);

    lastSellRef.current = {
      token: selectedAssetSell,
      buy: selectedAssetBuy,
      sellAmt: rawSell,
      buyAmt: computedBuy,
    };

    hfAmmSwap({
      amount: rawSell,
      minAmountOut,
      buyToken: selectedAssetBuy,
      sellToken: selectedAssetSell,
    });
    setRawBuy(computedBuy);
  }, [
    rawSell,
    slippage,
    selectedAssetBuy,
    selectedAssetSell,
    hfAmmSwap,
    getWebsocketPrice,
  ]);

  const handleMaxClick = useCallback(() => {
    onInputChange(
      formatUnits(balanceSell || BigInt(0), selectedAssetSell?.decimals || 6),
    );
  }, [onInputChange, balanceSell, selectedAssetSell?.decimals]);

  const buttonText = useMemo(() => {
    if (!selectedAssetBuy) return 'Select a token';
    const showInsufficientBalance = Boolean(
      rawSell > (balanceSell || BigInt(0)),
    );
    if (showInsufficientBalance) {
      return `Insufficient ${selectedAssetSell?.symbol} balance`;
    }
    return 'Swap';
  }, [rawSell, balanceSell, selectedAssetSell?.symbol, selectedAssetBuy]);

  const swapDisabled = connecting || isLoadingSwap || !client
    || stringSell === '' || !!sellInputError || !selectedAssetBuy;

  const hfAmmOrderStatus = txInfo
    ? orderStatus[txInfo.noteId]?.status
    : undefined;
  const showTxStatus = txInfo != null;

  const dismissTxInfo = useCallback(() => {
    clearForm();
    setTxInfo(null);
  }, [clearForm]);

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col relative dotted-bg'>
      <title>Swap - ZoroSwap | DeFi on Miden</title>
      <meta property='og:title' content='Swap - ZoroSwap | DeFi on Miden' />
      <meta name='twitter:title' content='Swap - ZoroSwap | DeFi on Miden' />
      <Header />
      <main className='flex-1 flex items-center justify-center px-3 py-4 sm:p-6'>
        <div className='w-full max-w-[580px]'>
          <h1 className='sr-only'>Swap Tokens</h1>

          <div className='relative flex justify-end mb-1'>
            <Slippage slippage={slippage} onSlippageChange={setSlippage} />
          </div>

          {/* Sell Card */}
          <Card className='border border-border/60 rounded-xl sm:rounded-2xl bg-card shadow-none'>
            <CardContent className='p-4 py-6 sm:p-8'>
              <div className='text-xs sm:text-sm text-primary font-semibold mb-3 sm:mb-4'>
                Sell
              </div>
              <div className='flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4'>
                <Input
                  value={stringSell ?? ''}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder='0'
                  aria-errormessage={sellInputError}
                  className={`border-none bg-transparent text-4xl sm:text-6xl font-semibold text-foreground outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner placeholder:text-foreground/70 ${
                    sellInputError
                      ? 'text-orange-600 placeholder:text-destructive/50'
                      : ''
                  }`}
                />
                <div className='relative'>
                  <TokenAutocomplete
                    tokens={allTokens}
                    value={selectedAssetSell}
                    onChange={(id) => setAsset('sell', id)}
                    priorityBech32s={hfAmmBech32s}
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
                        && hasOracle(selectedAssetSell)
                      ? (
                        <>
                          $<Price amount={rawSell} tokenConfig={selectedAssetSell} />
                        </>
                      )
                      : '$0'}
                  </div>
                  {accountId && selectedAssetSell && (
                    balanceSell === null
                      ? (
                        <span className='text-muted-foreground/60 text-xs inline-flex items-center gap-1.5 animate-pulse'>
                          <span className='inline-block h-3 w-12 rounded bg-muted-foreground/15' />
                          {selectedAssetSell.symbol}
                        </span>
                      )
                      : (
                        <button
                          onClick={handleMaxClick}
                          disabled={balanceSell === BigInt(0)}
                          className={`hover:text-foreground transition-colors cursor-pointer ${
                            sellInputError
                              ? 'text-orange-600 hover:text-destructive'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {balanceSellFmt} {selectedAssetSell.symbol}
                        </button>
                      )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swap Pairs */}
          <div className='flex justify-center -my-7 relative z-10'>
            <div className='bg-card rounded-xl p-1'>
              <SwapPairs swapPairs={swapPairs} disabled={isLoadingSwap} />
            </div>
          </div>

          {/* Buy Card */}
          <Card className='border-0 rounded-xl sm:rounded-2xl bg-muted shadow-none'>
            <CardContent className='p-4 py-6 sm:p-8 pb-10 sm:pb-12'>
              <div className='text-xs sm:text-sm text-primary font-semibold mb-3 sm:mb-4'>
                Buy
              </div>
              <div className='flex items-center justify-between gap-3 sm:gap-4'>
                <SwapInputBuy
                  amountSell={rawSell}
                  assetBuy={selectedAssetBuy}
                  assetSell={selectedAssetSell}
                />
                <div className='relative'>
                  <TokenAutocomplete
                    tokens={allTokens}
                    value={selectedAssetBuy}
                    onChange={(id) => setAsset('buy', id)}
                    disabledBech32s={buyDisabled}
                    priorityBech32s={hfAmmBech32s}
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
                  disabled={swapDisabled}
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
                    ? <Loader2 className='w-5 h-5 animate-spin' />
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

          {/* Exchange ratio */}
          <p className='text-xs text-center opacity-40 mt-3'>
            {selectedAssetBuy && selectedAssetSell
              ? (
                <span>
                  1 {selectedAssetSell.symbol} ={' '}
                  <ExchangeRatio
                    assetA={selectedAssetSell}
                    assetB={selectedAssetBuy}
                  />{' '}
                  {selectedAssetBuy.symbol}
                </span>
              )
              : null}
          </p>

          {/* Inline transaction status */}
          {showTxStatus && txInfo && (
            <InlineTxStatus
              txInfo={txInfo}
              hfAmmOrderStatus={hfAmmOrderStatus}
              onDismiss={dismissTxInfo}
            />
          )}
        </div>
      </main>
      <div className='flex items-center justify-center py-6'>
        {poweredByMiden}
      </div>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Transaction Status
// ---------------------------------------------------------------------------

function InlineTxStatus({
  txInfo,
  hfAmmOrderStatus,
  onDismiss,
}: {
  txInfo: SwapTxInfo;
  hfAmmOrderStatus?: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyNoteId = useCallback(async () => {
    if (!txInfo.noteId) return;
    try {
      await navigator.clipboard.writeText(txInfo.noteId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }, [txInfo.noteId]);

  const { label, color, bgColor, spinning, pulse } = useMemo(() => {
    switch (hfAmmOrderStatus) {
      case 'pending':
        return {
          label: 'Pending',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          spinning: false,
          pulse: true,
        };
      case 'matching':
        return {
          label: 'Matching',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          spinning: true,
          pulse: true,
        };
      case 'executed':
        return {
          label: 'Executed',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          spinning: false,
          pulse: false,
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          spinning: false,
          pulse: false,
        };
      case 'expired':
        return {
          label: 'Expired',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          spinning: false,
          pulse: false,
        };
      default:
        return {
          label: 'Created',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          spinning: false,
          pulse: true,
        };
    }
  }, [hfAmmOrderStatus]);

  const StatusIcon = spinning
    ? Loader2
    : label === 'Executed'
    ? CheckCircle
    : label === 'Failed'
    ? XCircle
    : Clock;

  const isDone = label === 'Executed' || label === 'Failed' || label === 'Expired';

  return (
    <div className='mt-4 rounded-xl border border-border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-semibold'>Swap Order</span>
        {isDone && (
          <button
            onClick={onDismiss}
            className='text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Status badge */}
      <div
        className={`flex items-center justify-center gap-2 rounded-lg p-2.5 ${bgColor}`}
      >
        <StatusIcon
          className={`h-4 w-4 ${color} ${spinning ? 'animate-spin' : ''} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
        <span className={`text-sm font-semibold ${color}`}>
          {label}
        </span>
      </div>

      {/* Amounts */}
      <div className='flex items-center gap-2 text-sm rounded-lg bg-muted/50 p-2.5'>
        <span className='inline-flex items-center gap-1'>
          <AssetIcon symbol={txInfo.sellToken.symbol} size={16} />
          <span className='dark:text-red-200 text-red-700'>
            {formalBigIntFormat({
              val: txInfo.sellAmount,
              expo: txInfo.sellToken.decimals,
            })} {txInfo.sellToken.symbol}
          </span>
        </span>
        <span className='text-muted-foreground'>→</span>
        <span className='inline-flex items-center gap-1'>
          <AssetIcon symbol={txInfo.buyToken.symbol} size={16} />
          <span className='dark:text-green-200 text-green-700'>
            {formalBigIntFormat({
              val: txInfo.buyAmount,
              expo: txInfo.buyToken.decimals,
            })} {txInfo.buyToken.symbol}
          </span>
        </span>
      </div>

      {/* Note ID */}
      {txInfo.noteId && (
        <div className='flex items-center gap-1.5 text-xs'>
          <span className='text-muted-foreground'>Note:</span>
          <button
            onClick={copyNoteId}
            className='font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer'
          >
            {copied
              ? (
                <span className='inline-flex items-center gap-1'>
                  <CheckCircle className='h-3 w-3 text-green-500' />
                  Copied
                </span>
              )
              : truncateId(txInfo.noteId)}
          </button>
          <a
            href={`https://testnet.midenscan.com/note/${txInfo.noteId}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-foreground'
          >
            <ExternalLink className='h-3 w-3' />
          </a>
        </div>
      )}

      {/* Contextual hint */}
      {label === 'Executed' && (
        <p className='text-xs text-muted-foreground'>
          Claim your tokens in the wallet.
        </p>
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
    localStorage.setItem(
      'swap-' + side,
      JSON.stringify({
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        faucetIdBech32: token.faucetIdBech32,
        oracleId: token.oracleId,
      }),
    );
  } else {
    localStorage.removeItem('swap-' + side);
  }
};
