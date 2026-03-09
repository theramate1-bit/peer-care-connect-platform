import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  mode: 'development',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    // Force a single React runtime (see docs/troubleshooting/react-runtime-duplication-fix.md)
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(true),
    __DEBUG__: JSON.stringify(true),
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  optimizeDeps: {
    // Explicitly pre-bundle React once (prevents duplicate runtimes)
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    esbuildOptions: { mainFields: ['module', 'main'] },
    // Force a fresh pre-bundle so dedupe/aliases are applied
    force: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'production' ? false : true, // Disable source maps in production
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    terserOptions: process.env.NODE_ENV === 'production' ? {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    } : undefined,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    cors: true,
    strictPort: false,
    fs: { allow: [path.resolve(__dirname, "..")] },
    hmr: {
      overlay: true,
    },
    // Proxy external APIs to avoid CORS issues in Chrome
    proxy: {
      '/api/photon': {
        target: 'https://photon.komoot.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/photon/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Photon proxy error', err);
          });
        },
      },
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Nominatim proxy error', err);
          });
        },
      },
    },
  },
  logLevel: 'info',
  base: '/'
});
