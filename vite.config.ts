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
      '@demox-labs/miden-sdk': '@miden-sdk/miden-sdk',
    },
    dedupe: [
      '@getpara/web-sdk',
      '@getpara/react-sdk-lite',
    ],
  },
  assetsInclude: ['**/*.wasm', '**/*.masm'],
  optimizeDeps: {
    exclude: [
      '@miden-sdk/miden-sdk',
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
