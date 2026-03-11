import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface PoolDetailLayoutProps {
  backTo: string;
  backLabel?: string;
  title?: string;
  children: ReactNode;
}

export function PoolDetailLayout({
  backTo,
  backLabel = 'Back to pools',
  title,
  children,
}: PoolDetailLayoutProps) {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      {title && <title>{title} - ZoroSwap</title>}
      <Header />
      <main className='flex-1 w-full max-w-6xl mx-auto px-6 py-8'>
        <Link
          to={backTo}
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          {backLabel}
        </Link>
        {children}
      </main>
      <Footer />
    </div>
  );
}
