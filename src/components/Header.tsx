import { Link, useLocation } from 'react-router-dom';
import { ModeToggle } from './ModeToggle';
import { UnifiedWalletButton } from './UnifiedWalletButton';

export function Header() {
  const location = useLocation();

  const navLinkClass = (path: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors h-10 inline-flex items-center ${
      location.pathname === path || location.pathname.startsWith(path + '/')
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <header className='px-6 py-6 border-b border-border bg-background'>
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <Link
          to='/'
          aria-label='ZoroSwap'
          className='flex items-center shrink-0 justify-self-start'
        >
          <img
            src='/zoro-logo-full.svg'
            alt='Zoro'
            title='ZoroSwap | DeFi on Miden'
            className='h-10 w-10'
          />
        </Link>
        <nav className='flex items-center gap-1 font-cal-sans justify-self-center'>
          <Link to='/' className={navLinkClass('/')}>
            Swap
          </Link>
          <Link to='/explore' className={navLinkClass('/explore')}>
            Explore
          </Link>
          <Link to='/pools' className={navLinkClass('/pools')}>
            Pools
          </Link>
          <Link to='/faucet' className={navLinkClass('/faucet')}>
            Faucet
          </Link>
          <Link to='/launchpad' className={navLinkClass('/launchpad')}>
            Launchpad
          </Link>
        </nav>
        <div className='flex items-center gap-3 justify-self-end'>
          <ModeToggle />
          <UnifiedWalletButton className='bg-muted hover:bg-muted/80 text-foreground rounded-lg px-4 py-2 text-sm font-medium' />
        </div>
      </div>
    </header>
  );
}
