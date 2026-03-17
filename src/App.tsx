import { NETWORK } from '@/lib/config';
import { OracleProvider } from '@/providers/OracleProvider';
import {
  MidenFiSignerProvider,
  MidenWalletAdapter,
  WalletAdapterNetwork,
  WalletModalProvider,
  WalletProvider,
} from '@miden-sdk/miden-wallet-adapter';
import { MidenProvider } from '@miden-sdk/react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NotFound from './pages/404';
import FaucetPage from './pages/Faucet';
import SwapPage from './pages/Swap';
import { ThemeProvider } from './providers/ThemeProvider';
import '@miden-sdk/miden-wallet-adapter/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bounce, ToastContainer } from 'react-toastify';
import { DisclaimerGate } from './components/Disclaimer';
import Explore from './pages/Explore';
import HfPoolDetail from './pages/HfPoolDetail';
import Launchpad from './pages/Launchpad';
import NewXykPool from './pages/NewXykPool';
import Pools from './pages/Pools';
import XykPoolDetail from './pages/XykPoolDetail';
import ModalProvider from './providers/ModalProvider';
import { ZoroProvider } from './providers/ZoroProvider';

const queryClient = new QueryClient();

/** Map env to wallet adapter network (adapter supports Testnet | Localnet) */
function walletNetwork(): WalletAdapterNetwork {
  const id = import.meta.env.VITE_NETWORK_ID;
  if (id === 'localhost') return WalletAdapterNetwork.Localnet;
  return WalletAdapterNetwork.Testnet;
}

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<SwapPage />} />
        <Route path='/faucet' element={<FaucetPage />} />
        <Route path='/launchpad' element={<Launchpad />} />
        <Route path='/explore' element={<Explore />} />
        <Route path='/pools/hf/:poolId' element={<HfPoolDetail />} />
        <Route path='/pools/xyk/:poolId' element={<XykPoolDetail />} />
        <Route path='/pools' element={<Pools />} />
        <Route path='/new-xyk-pool' element={<NewXykPool />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Router>
  );
}
const wallets = [
  new MidenWalletAdapter({ appName: 'ZoroSwap' }),
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <MidenFiSignerProvider
            appName='Zoro'
            network={walletNetwork()}
            autoConnect
          >
            <MidenProvider
              config={{
                rpcUrl: NETWORK.rpcEndpoint,
                autoSyncInterval: 15000,
              }}
            >
              <ZoroProvider>
                <ThemeProvider storageKey='vite-ui-theme'>
                  <OracleProvider>
                    <ModalProvider>
                      <DisclaimerGate>
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
                      </DisclaimerGate>
                    </ModalProvider>
                  </OracleProvider>
                </ThemeProvider>
              </ZoroProvider>
            </MidenProvider>
          </MidenFiSignerProvider>
        </WalletModalProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
