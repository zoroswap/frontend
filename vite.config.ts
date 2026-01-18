import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Dedupe Para packages to prevent multiple Stencil runtimes
    dedupe: [
      '@getpara/web-sdk',
      '@getpara/react-sdk',
      '@getpara/react-sdk-lite',
      '@getpara/react-components',
      '@getpara/core-components',
    ],
  },
  assetsInclude: ['**/*.wasm', '**/*.masm'],
  optimizeDeps: {
    // Keep Miden SDK unbundled and avoid prebundling Para's Stencil component bundles
    // to prevent multiple runtimes in dev.
    exclude: [
      '@demox-labs/miden-sdk',
      '@getpara/react-components',
      '@getpara/core-components',
      '@getpara/cosmos-wallet-connectors',
      '@getpara/evm-wallet-connectors',
      '@getpara/solana-wallet-connectors',
      '@getpara/wagmi-v2-connector',
      '@getpara/cosmjs-v0-integration',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  server: {
    allowedHosts: ['zoroswap.com'],
  },
});
