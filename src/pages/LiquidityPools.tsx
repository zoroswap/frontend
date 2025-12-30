import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import LiquidityPoolsTable from '@/components/LiquidityPoolsTable';

function LiquidityPools() {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col dotted-bg'>
      <title>Pools - ZoroSwap | DeFi on Miden</title>
      <meta
        name='description'
        content='Deposit to ZoroSwap pools to earn attractive yield'
      />
      <meta property='og:title' content='About - ZoroSwap | DeFi on Miden' />
      <meta
        property='og:description'
        content='Deposit to ZoroSwap pools to earn attractive yield'
      />
      <meta name='twitter:title' content='About - ZoroSwap | DeFi on Miden' />
      <meta
        name='twitter:description'
        content='Deposit to ZoroSwap pools to earn attractive yield'
      />
      <Header />
      <main className='flex flex-1 items-center justify-center p-4 sm:mt-10'>
        <LiquidityPoolsTable />
      </main>
      <Footer />
    </div>
  );
}

export default LiquidityPools;
