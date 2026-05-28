import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { assertStripeEnvSafe } from "../scripts/stripe-env-guard.mjs";

const SHELL_SRC = path.resolve(__dirname, "./src");
const WEB_SRC = path.resolve(__dirname, "../src");
const WEB_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".json"];

/**
 * Files under repo-root `src/` import `@/…`; map those to `@web` while shell
 * `peer-care-connect/src/` keeps using `@` → shell.
 */
function webAwareAtAlias() {
  return {
    name: "web-aware-at-alias",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined) {
      if (!source.startsWith("@/") || !importer) return null;
      const norm = importer.replace(/\\/g, "/");
      const inWebTree =
        norm.includes("/src/") && !norm.includes("/peer-care-connect/");
      const rel = source.slice(2);
      const roots = inWebTree ? [WEB_SRC, SHELL_SRC] : [SHELL_SRC, WEB_SRC];
      for (const root of roots) {
        const base = path.join(root, rel);
        for (const ext of WEB_EXTENSIONS) {
          const candidate = base + ext;
          if (fs.existsSync(candidate)) return candidate;
        }
        if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
          for (const ext of WEB_EXTENSIONS) {
            const indexFile = path.join(base, "index" + ext);
            if (fs.existsSync(indexFile)) return indexFile;
          }
        }
      }
      return path.join(roots[0], rel);
    },
  };
}

/** Block shipping Stripe sk_* / whsec_* into the client bundle via VITE_* vars. */
function stripeEnvGuardPlugin() {
  return {
    name: "stripe-env-guard",
    config() {
      assertStripeEnvSafe(process.env);
    },
  };
}

const isProduction = process.env.NODE_ENV === "production";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  mode: mode === "production" || isProduction ? "production" : "development",
  plugins: [
    stripeEnvGuardPlugin(),
    webAwareAtAlias(),
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    // Force a single React runtime (see docs/troubleshooting/react-runtime-duplication-fix.md)
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      // Do NOT set "@" here — webAwareAtAlias routes @/ to shell vs ../src by importer.
      "@web": path.resolve(__dirname, "../src"),
      "@theramate/user-preferences": path.resolve(
        __dirname,
        "../packages/user-preferences/index.js",
      ),
    },
  },
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(!isProduction),
    __DEBUG__: JSON.stringify(!isProduction),
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
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
}));
