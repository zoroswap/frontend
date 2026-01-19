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
        paraModalConfig={{
          logo: "https://app.zoroswap.com/zoro-logo-full.svg",
          theme: {"accentColor":"#ff5501","foregroundColor":"#000000","backgroundColor":"#FFFFFF"},
          oAuthMethods: ["GOOGLE","TWITTER","TELEGRAM"],
          authLayout: ["AUTH:FULL","EXTERNAL:FULL"],
          recoverySecretStepEnabled: true,
        }}
      >
        {children}
      </ParaProvider>
    )
    : children;
}
