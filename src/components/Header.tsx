import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ModeToggle } from './ModeToggle';
import { StatusBanner } from './StatusBanner';
import { UnifiedWalletButton } from './UnifiedWalletButton';

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = (path: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors h-10 inline-flex items-center ${
      location.pathname === path || location.pathname.startsWith(path + '/')
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const mobileNavLinkClass = (path: string) =>
    `block px-4 py-3 text-base font-medium transition-colors ${
      location.pathname === path || location.pathname.startsWith(path + '/')
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <>
      <header className='px-4 sm:px-6 py-4 sm:py-6 border-b border-border bg-background'>
        {/* Desktop */}
        <div className='hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
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

        {/* Mobile */}
        <div className='flex md:hidden items-center justify-between'>
          <Link
            to='/'
            aria-label='ZoroSwap'
            className='flex items-center shrink-0'
          >
            <img
              src='/zoro-logo-full.svg'
              alt='Zoro'
              title='ZoroSwap | DeFi on Miden'
              className='h-8 w-8'
            />
          </Link>
          <div className='flex-1 flex justify-center'>
            <UnifiedWalletButton className='bg-muted hover:bg-muted/80 text-foreground rounded-md px-2 py-1 text-[10px] font-medium' />
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='p-2 text-foreground shrink-0'
            aria-label='Toggle menu'
          >
            {mobileMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <nav className='md:hidden mt-3 pt-3 border-t border-border font-cal-sans'>
            <Link
              to='/'
              className={mobileNavLinkClass('/')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Swap
            </Link>
            <Link
              to='/explore'
              className={mobileNavLinkClass('/explore')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              to='/faucet'
              className={mobileNavLinkClass('/faucet')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Faucet
            </Link>
            <Link
              to='/launchpad'
              className={mobileNavLinkClass('/launchpad')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Launchpad
            </Link>
          </nav>
        )}
      </header>
      <StatusBanner />
    </>
  );
}
