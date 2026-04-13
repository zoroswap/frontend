import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import XykWizard from '@/components/xyk-wizard/XykWizard';

export default function NewXykPool() {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Create pool - ZoroSwap | DeFi on Miden</title>
      <Header />
      <main className='flex-1 w-full max-w-5xl mx-auto px-6 py-8'>
        <XykWizard />
      </main>
      <Footer />
    </div>
  );
}
