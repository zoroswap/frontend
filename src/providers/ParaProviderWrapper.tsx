import { Environment, ParaProvider } from '@getpara/react-sdk';
import '@getpara/react-sdk/styles.css';
import type { ReactNode } from 'react';

interface ParaProviderWrapperProps {
  readonly children: ReactNode;
}

export function ParaProviderWrapper({ children }: ParaProviderWrapperProps) {
  return import.meta.env.VITE_PARA_API_KEY
    ? (
      <ParaProvider
        paraClientConfig={{
          env: Environment.BETA,
          apiKey: import.meta.env.VITE_PARA_API_KEY,
        }}
        config={{ appName: 'ZoroSwap' }}
      >
        {children}
      </ParaProvider>
    )
    : children;
}
