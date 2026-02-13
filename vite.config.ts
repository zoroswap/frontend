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
    // Local dev proxy for gRPC-web requests to the Miden node.
    // Only active during `npm run dev`, because `configureServer` is a 
    // dev-server-only hook and is never invoked during `npm run build`
    //  or in production.
    //
    // Why it's needed:
    //   - Vite dev server by default runs on localhost:5173
    //   - Local Miden node by default runs on localhost:57291
    //   - Different ports = different origins, so the browser blocks requests (CORS)
    //   - For local development, we need to set `VITE_RPC_ENDPOINT=http://localhost:5173` 
    //     to keep requests same-origin. This middleware then forwards them to the Miden node.
    //
    // Note: Vite's built-in `server.proxy` config does not intercept gRPC-web
    // POST requests originating from WASM web workers. This would have been an alternative
    // solution. Using `http-proxy-middleware` via `configureServer` registers our middleware
    //  at a lower level that catches all requests.
    {
      name: 'grpc-web-proxy',
      configureServer(server) {
        const proxy = createProxyMiddleware({
          target: 'http://localhost:57291',
          changeOrigin: true,
        });
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
