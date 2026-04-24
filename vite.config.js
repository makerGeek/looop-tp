import { defineConfig } from 'vite';

// GitHub Pages lives at /<repo>/, so base must match the repo name.
// Override with VITE_BASE when deploying elsewhere (e.g. custom domain: VITE_BASE=/).
const base = process.env.VITE_BASE ?? '/looop-tp/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0
  },
  server: {
    port: 5173,
    open: true
  }
});
