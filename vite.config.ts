import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  mode: 'development', // FORCE: Always run in development mode for debugging
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.env.NODE_ENV': '"development"', // FORCE: Set NODE_ENV to development
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  esbuild: {
    loader: "tsx",
    include: /.*\.[tj]sx?$/,
    exclude: [],
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // ENABLED: Enable sourcemaps for debugging
    minify: false, // DISABLED: Disable minification to get readable React error #300 messages
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
  },
  base: '/'
});
