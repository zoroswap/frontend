import { WalletMultiButton } from '@demox-labs/miden-wallet-adapter';
import { Link } from 'react-router-dom';
import { ModeToggle } from './ModeToggle';

export function Header() {
  return (
    <div className='flex flex-col gap-4 sm:gap-8 sm:flex-row items-center p-4 relative'>
      <Link to='/'>
        <h1 className='font-cal-sans text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-0'>
          <img
            src='/zoro-logo-full.svg'
            alt='Zoro logo'
            title='ZoroSwap | DeFi on Miden'
            className='h-12 w-12 sm:h-16 sm:w-16'
          />
        </h1>
      </Link>
      <div className='flex flex-grow text-md items-center ml-4 font-cal-sans'>
        <Link to='/'>
          <div className='px-4 opacity-70 hover:opacity-100 h-12 sm:h-16inline-block flex flex-col justify-center'>
            Swap
          </div>
        </Link>
        <Link to='/pools'>
          <span className='px-4 opacity-70 hover:opacity-100 h-12 sm:h-16 inline-block flex flex-col justify-center'>
            Pools
          </span>
        </Link>
        <Link to='/faucet'>
          <span className='px-4 opacity-70 hover:opacity-100 h-12 sm:h-16 inline-block flex flex-col justify-center'>
            Faucet
          </span>
        </Link>
      </div>
      <div className='flex items-center gap-4'>
        <ModeToggle />
        <div className='top-4'>
          <WalletMultiButton className='!p-3 sm:!py-4 !rounded-xl !font-medium !text-sm sm:!text-md !text-muted-foreground !border-none hover:!text-foreground hover:!bg-gray-500/10 dark:!bg-muted/30 dark:hover:!bg-muted/70' />
        </div>
      </div>
    </div>
  );
}
