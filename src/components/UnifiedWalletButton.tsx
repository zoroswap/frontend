import { useClaimNotes } from '@/hooks/useClaimNotes';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { truncateAddress } from '@/utils/format';
import { useWalletModal } from '@demox-labs/miden-wallet-adapter';
import { useModal } from '@getpara/react-sdk';
import { ChevronDown, Download, Loader2, LogOut, Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { WalletSelectionModal } from './WalletSelectionModal';

interface UnifiedWalletButtonProps {
  readonly className?: string;
}

export function UnifiedWalletButton({ className }: UnifiedWalletButtonProps) {
  const { connected, connecting, walletType, address, disconnect } = useUnifiedWallet();
  const { claimNotes, claiming, isParaWallet, isExpectingNotes, pendingNotesCount } =
    useClaimNotes();
  const { openModal } = useModal();
  const { setVisible: setMidenModalVisible } = useWalletModal();
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleOpenSelectionModal = useCallback(() => {
    setShowSelectionModal(true);
  }, []);

  const handleCloseSelectionModal = useCallback(() => {
    setShowSelectionModal(false);
  }, []);

  const handleSelectMiden = useCallback(() => {
    setMidenModalVisible(true);
  }, [setMidenModalVisible]);

  const handleSelectPara = useCallback(() => {
    openModal();
  }, [openModal]);

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

  // Connected state: show address with dropdown
  if (connected && address) {
    return (
      <div className='relative'>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm text-muted-foreground border-none hover:text-foreground hover:bg-gray-500/10 dark:bg-muted/30 dark:hover:bg-muted/70 ${className}`}
        >
          <div className='relative'>
            <Wallet className='h-4 w-4' />
            {isParaWallet && (isExpectingNotes || pendingNotesCount > 0) && (
              <span className='absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-0.5'>
                {isExpectingNotes
                  ? <Loader2 className='h-2.5 w-2.5 animate-spin' />
                  : pendingNotesCount}
              </span>
            )}
          </div>
          <span>{truncateAddress(address)}</span>
          {walletType && (
            <span className='text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase'>
              {walletType}
            </span>
          )}
          <ChevronDown className='h-4 w-4' />
        </button>

        {showDropdown && (
          <>
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowDropdown(false)}
            />
            <div className='absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden'>
              {isParaWallet && (
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
                  {pendingNotesCount > 0 && !claiming && (
                    <span className='text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary'>
                      {pendingNotesCount}
                    </span>
                  )}
                </button>
              )}
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

  // Connecting state
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

  // Disconnected state: show connect button
  return (
    <>
      <button
        onClick={handleOpenSelectionModal}
        className={`flex items-center gap-2 p-3 rounded-xl font-medium text-sm text-muted-foreground border-none hover:text-foreground hover:bg-gray-500/10 dark:bg-muted/30 dark:hover:bg-muted/70 ${className}`}
      >
        <Wallet className='h-4 w-4' />
        Connect Wallet
      </button>

      {showSelectionModal && (
        <WalletSelectionModal
          onClose={handleCloseSelectionModal}
          onSelectMiden={handleSelectMiden}
          onSelectPara={handleSelectPara}
        />
      )}
    </>
  );
}
