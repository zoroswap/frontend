import { OracleProvider } from '@/providers/OracleProvider';
import {
  MidenWalletAdapter,
  WalletModalProvider,
  WalletProvider,
} from '@demox-labs/miden-wallet-adapter';
import { useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NotFound from './pages/404';
import About from './pages/About';
import FaucetPage from './pages/Faucet';
import MediaKit from './pages/MediaKit';
import SwapPage from './pages/Swap';
import { ThemeProvider } from './providers/ThemeProvider';
import '@demox-labs/miden-wallet-adapter-reactui/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bounce, ToastContainer } from 'react-toastify';
import LiquidityPools from './pages/LiquidityPools';
import ModalProvider from './providers/ModalProvider';
import { ZoroProvider } from './providers/ZoroProvider';

const queryClient = new QueryClient();

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<SwapPage />} />
        <Route path='/faucet' element={<FaucetPage />} />
        <Route path='/about' element={<About />} />
        <Route path='/media-kit' element={<MediaKit />} />
        <Route path='/pools' element={<LiquidityPools />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function App() {
  const wallets = useMemo(
    () => [
      new MidenWalletAdapter({
        appName: 'Zoro',
      }),
    ],
    [],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ZoroProvider>
            <ThemeProvider storageKey='vite-ui-theme'>
              <OracleProvider>
                <ModalProvider>
                  <AppRouter />
                  <ToastContainer
                    position='top-center'
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick={false}
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme='dark'
                    transition={Bounce}
                  />
                </ModalProvider>
              </OracleProvider>
            </ThemeProvider>
          </ZoroProvider>
        </WalletModalProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
