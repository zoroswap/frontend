import { ParaProvider, Environment } from '@getpara/react-sdk';
import '@getpara/react-sdk/styles.css';
import type { ReactNode } from 'react';

interface ParaProviderWrapperProps {
  readonly children: ReactNode;
}

export function ParaProviderWrapper({ children }: ParaProviderWrapperProps) {
  return (
    <ParaProvider
      paraClientConfig={{
        env: Environment.BETA,
        apiKey: import.meta.env.VITE_PARA_API_KEY,
      }}
      config={{ appName: 'ZoroSwap' }}
    >
      {children}
    </ParaProvider>
  );
}
