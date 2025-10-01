import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@common': resolve(__dirname, 'src/common'),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all interfaces so Electron can connect
    port: 3000,
    fs: {
      // Allow serving files from the project root
      allow: ['.']
    }
  },
});