import { useClaimNotes } from '@/hooks/useClaimNotes';
import { truncateAddress } from '@/lib/format';
import { useWallet } from '@miden-sdk/miden-wallet-adapter';
import { ChevronDown, Download, Loader2, LogOut, Wallet } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

interface UnifiedWalletButtonProps {
  readonly className?: string;
}

export function UnifiedWalletButton({ className }: UnifiedWalletButtonProps) {
  const { connected, connecting, address, connect, disconnect, wallet, wallets, select } = useWallet();
  const walletType = connected ? 'miden' : null;
  const { claimNotes, claiming, isExpectingNotes, pendingNotesCount } = useClaimNotes();
  const [showDropdown, setShowDropdown] = useState(false);
  const pendingConnectRef = useRef(false);

  useEffect(() => {
    if (wallet && pendingConnectRef.current) {
      pendingConnectRef.current = false;
      connect();
    }
  }, [wallet, connect]);

  const handleConnect = useCallback(() => {
    if (wallet) {
      connect();
    } else if (wallets.length > 0) {
      select(wallets[0].adapter.name);
      pendingConnectRef.current = true;
    }
  }, [wallet, wallets, select, connect]);

  const handleDisconnect = useCallback(async () => {
    setShowDropdown(false);
    await disconnect();
  }, [disconnect]);

  const handleClaimNotes = useCallback(async () => {
    try {
      const result = await claimNotes();
      if (result.claimed > 0) {
        toast.success(`Claimed ${result.claimed} note(s)`);
      } else {
        toast.info('No notes to claim');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to claim notes');
    }
  }, [claimNotes]);

  if (connected && address) {
    return (
      <div className='relative'>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`inline-flex items-center justify-center gap-1 sm:gap-2 p-1.5 sm:p-3 rounded-md sm:rounded-xl font-medium text-[10px] sm:text-sm text-muted-foreground border-none hover:text-foreground hover:bg-gray-500/10 dark:bg-muted/30 dark:hover:bg-muted/70 ${className}`}
        >
          <div className='relative'>
            <Wallet className='h-3 w-3 sm:h-4 sm:w-4' />
            {(isExpectingNotes || pendingNotesCount > 0) && (
              <span className='absolute -top-1.5 -right-1.5 min-w-[12px] h-[12px] flex items-center justify-center text-[8px] sm:text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-0.5'>
                {isExpectingNotes
                  ? <Loader2 className='h-2 w-2 animate-spin' />
                  : pendingNotesCount}
              </span>
            )}
          </div>
          <span className='text-[10px] sm:text-sm'>{truncateAddress(address)}</span>
          {walletType && (
            <span className='text-[8px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase'>
              {walletType}
            </span>
          )}
          <ChevronDown className='h-3 w-3 sm:h-4 sm:w-4' />
        </button>

        {showDropdown && (
          <>
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowDropdown(false)}
            />
            <div className='absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden'>
              <button
                onClick={handleClaimNotes}
                disabled={claiming}
                className='w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {claiming
                  ? <Loader2 className='h-4 w-4 animate-spin' />
                  : <Download className='h-4 w-4' />}
                <span className='flex-1'>
                  {claiming ? 'Claiming...' : 'Claim Notes'}
                </span>
                {(isExpectingNotes || pendingNotesCount > 0) && !claiming && (
                  <span className='text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary'>
                    {isExpectingNotes
                      ? <Loader2 className='h-3 w-3 animate-spin' />
                      : pendingNotesCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                className='w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-2 text-red-500'
              >
                <LogOut className='h-4 w-4' />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (connecting) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm text-muted-foreground border-none bg-muted/30 opacity-50 cursor-not-allowed ${className}`}
      >
        <span className='animate-spin'>⟳</span>
        Connecting...
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm text-muted-foreground border-none hover:text-foreground hover:bg-gray-500/10 dark:bg-muted/30 dark:hover:bg-muted/70 ${className}`}
    >
      <Wallet className='h-4 w-4' />
      Connect Wallet
    </button>
  );
}
