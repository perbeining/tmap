import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        om: resolve(import.meta.dirname, 'om.html'),
      },
    },
  },
  server: {
    // Under udvikling sendes /api videre til `wrangler pages dev` på port 8788.
    proxy: { '/api': 'http://localhost:8788' },
  },
});
