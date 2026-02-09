import react from '@vitejs/plugin-react';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    {
      name: 'grpc-web-proxy',
      configureServer(server) {
        const proxy = createProxyMiddleware({
          target: 'http://localhost:57291',
          changeOrigin: true,
        });
        // Proxy gRPC-web requests (POST with grpc content-type) to the Miden node
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.headers['content-type']?.includes('grpc')) {
            return proxy(req, res, next);
          }
          next();
        });
      },
    },
  ],
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
