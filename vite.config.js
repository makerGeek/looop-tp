import { defineConfig } from 'vite';

// Relative base paths so the build works at any URL:
// GitHub Pages (/looop-tp/), Cloudflare Pages (root), custom domains, file://
// Override with VITE_BASE if you ever need an absolute path.
const base = process.env.VITE_BASE ?? './';

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
