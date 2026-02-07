import { Button } from '@/components/ui/button';
import type { TokenConfig } from '@/providers/ZoroProvider';
import type { OrderStatus } from '@/services/websocket';
import { formalBigIntFormat, truncateId } from '@/utils/format';
import { CheckCircle, Clock, ExternalLink, Loader2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { LpActionType } from './PoolModal';

const AnimatedDots = () => (
  <span className='animated-dots'>
    <span>.</span>
    <span>.</span>
    <span>.</span>
  </span>
);

export interface TxResult {
  readonly txId?: string;
  readonly noteId?: string;
}

interface SwapDetails {
  readonly sellToken?: TokenConfig;
  readonly buyToken?: TokenConfig;
  readonly sellAmount?: bigint;
  readonly buyAmount?: bigint;
}

export interface LpDetails {
  readonly token: TokenConfig;
  readonly amount: bigint;
  readonly actionType: LpActionType;
}

interface OrderStatusProps {
  readonly onClose: () => void;
  readonly swapResult?: TxResult;
  readonly swapDetails?: SwapDetails;
  readonly lpDetails?: LpDetails;
  readonly orderStatus?: OrderStatus;
  readonly orderReason?: string;
  readonly title: string;
}

const getOrderStatusDisplay = (status?: OrderStatus) => {
  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        text: 'Pending',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        shouldPulse: true,
      };
    case 'matching':
      return {
        icon: Loader2,
        text: 'Matching',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        animate: true,
        shouldPulse: true,
      };
    case 'executed':
      return {
        icon: CheckCircle,
        text: 'Executed',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      };
    case 'failed':
      return {
        icon: XCircle,
        text: 'Failed',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      };
    case 'expired':
      return {
        icon: Clock,
        text: 'Expired',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      };
    default:
      return {
        icon: Clock,
        text: 'Created',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        shouldPulse: true,
      };
  }
};

export function OrderStatus({
  onClose,
  swapResult,
  swapDetails,
  lpDetails,
  orderStatus,
  orderReason,
  title,
}: OrderStatusProps) {
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const statusDisplay = getOrderStatusDisplay(orderStatus);

  useEffect(() => {
    if (!isVisible) {
      setIsVisible(true);
    }
  }, [isVisible]);

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  if (!swapResult) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-all duration-300 ease-in-out ${
          isVisible && !isClosing
            ? 'opacity-100'
            : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'>
        <div
          className={`w-80 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-in-out ${
            isVisible && !isClosing
              ? 'opacity-100 translate-y-0 scale-100'
              : isVisible && isClosing
              ? 'opacity-0 translate-y-[-100%] scale-95'
              : 'opacity-0 translate-y-[100%] scale-95'
          }`}
        >
          <div className='bg-background border border-border rounded-2xl shadow-xl p-4'>
            <div className='flex justify-between items-center mb-3'>
              <span className='font-semibold text-sm'>{title}</span>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleClose}
                className='h-6 w-6 rounded-full hover:bg-muted'
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
            {/* Order Status */}
            <div
              className={`mb-4 p-3 rounded-lg border-2 ${statusDisplay.bgColor} ${
                orderStatus === 'executed'
                  ? 'border-green-500'
                  : orderStatus === 'failed'
                  ? 'border-red-500'
                  : orderStatus === 'matching'
                  ? 'border-blue-500'
                  : 'border-transparent'
              }`}
            >
              <div className='flex items-center justify-center gap-2'>
                <statusDisplay.icon
                  className={`h-5 w-5 ${statusDisplay.color} ${
                    statusDisplay.animate ? 'animate-spin' : ''
                  } ${statusDisplay.shouldPulse ? 'animate-status-pulse' : ''}`}
                />
                <span className={`font-semibold ${statusDisplay.color}`}>
                  Order {statusDisplay.text}
                </span>
              </div>
              {orderStatus === 'executed' && (
                <p className='text-xs text-center mt-1 text-green-600 dark:text-green-400'>
                  Your order has been completed successfully!
                </p>
              )}
              {(orderStatus === 'failed' || orderStatus === 'expired') && orderReason && (
                <p className='text-xs text-center mt-1 text-red-600 dark:text-red-400'>
                  {orderReason}
                </p>
              )}
              {orderStatus === 'matching' && (
                <p className='text-xs text-center mt-1 text-blue-600 dark:text-blue-400'>
                  Finding the best price for your order <AnimatedDots />
                </p>
              )}
              {orderStatus === 'pending' && (
                <p className='text-xs text-center mt-1 text-yellow-600 dark:text-yellow-400'>
                  Your order is waiting to be processed <AnimatedDots />
                </p>
              )}
              {!orderStatus && (
                <p className='text-xs text-center mt-1 text-muted-foreground'>
                  Waiting for order confirmation <AnimatedDots />
                </p>
              )}
            </div>

            {lpDetails && (
              <div className='mb-4'>
                <div className='flex gap-2 text-sm p-2 bg-muted/50 rounded-md'>
                  <span className='text-muted-foreground text-xs'>
                    {lpDetails.actionType}
                  </span>
                  <div>
                    {formalBigIntFormat({
                      val: lpDetails.amount ?? BigInt(0),
                      expo: lpDetails.token?.decimals || 6,
                    })} {lpDetails.token?.symbol}
                  </div>
                </div>
              </div>
            )}
            {swapDetails && (
              <div className='mb-4'>
                <div className='flex gap-2 text-sm p-2 bg-muted/50 rounded-md'>
                  <div className='dark:text-red-200 text-red-700'>
                    {formalBigIntFormat({
                      val: swapDetails.sellAmount ?? BigInt(0),
                      expo: swapDetails.sellToken?.decimals || 6,
                    })} {swapDetails?.sellToken?.symbol}
                  </div>
                  <span className='text-muted-foreground text-xs'>→</span>
                  <div className='dark:text-green-200 text-green-700'>
                    {formalBigIntFormat({
                      val: swapDetails.buyAmount ?? BigInt(0),
                      expo: swapDetails.buyToken?.decimals || 6,
                    })} {swapDetails?.buyToken?.symbol}
                  </div>
                </div>
              </div>
            )}
            {orderStatus === 'executed' && !lpDetails && (
              <div className='text-xs text-left mb-4 opacity-90'>
                Claim your tokens in the wallet.
              </div>
            )}
            <div className='space-y-2'>
              <div>
                <label className='text-xs text-muted-foreground block mb-1'>
                  Note ID
                </label>
                <div className='flex items-center gap-1 p-2 bg-muted/50 rounded-md'>
                  <button
                    onClick={() => copyText(swapResult.noteId ?? '')}
                    className='text-xs flex-1 font-mono text-foreground text-left hover:bg-muted/50 rounded transition-colors cursor-pointer p-1'
                  >
                    {copiedText
                      ? (
                        <span className='flex items-center gap-1'>
                          <CheckCircle className='h-3 w-3 text-green-500' />
                          Copied!
                        </span>
                      )
                      : (
                        truncateId(swapResult.noteId ?? '')
                      )}
                  </button>
                  <a
                    href={`https://testnet.midenscan.com/note/${swapResult.noteId}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </div>
                {orderStatus === 'executed' && (
                  <Button
                    onClick={handleClose}
                    className='mt-5 w-full h-full'
                    variant='secondary'
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
