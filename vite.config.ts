import react from '@vitejs/plugin-react';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { type Plugin, defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

/**
 * Stub out optional @getpara transitive dependencies that aren't installed.
 * Works for both the dev server (esbuild) and production build (Rollup).
 */
function stubOptionalParaDeps(): Plugin {
  const prefixes = [
    '@getpara/aa-',
    '@getpara/cosmjs-',
    '@getpara/ethers-',
    '@getpara/solana-signers-',
    '@getpara/stellar-sdk-',
    '@getpara/viem-',
  ];
  const exact = new Set(['@getpara/react-sdk']);

  function matches(id: string) {
    return prefixes.some((p) => id.startsWith(p)) || exact.has(id);
  }

  return {
    name: 'stub-optional-para-deps',
    enforce: 'pre',
    resolveId(id) {
      if (matches(id)) return '\0stub:' + id;
    },
    load(id) {
      if (id.startsWith('\0stub:')) return 'export default {};';
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    stubOptionalParaDeps(),
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
      plugins: [
        {
          name: 'stub-optional-para-deps',
          setup(build) {
            const filter =
              /^@getpara\/(aa-|cosmjs-|ethers-|solana-signers-|stellar-sdk-|viem-|react-sdk$)/;
            build.onResolve({ filter }, (args) => ({
              path: args.path,
              namespace: 'stub-para',
            }));
            build.onLoad({ filter: /.*/, namespace: 'stub-para' }, () => ({
              contents: 'export default {};',
              loader: 'js',
            }));
          },
        },
      ],
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
