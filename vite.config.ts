import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
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
    port: 3000,
    host: '127.0.0.1', // Explicitly bind to IPv4 localhost
    strictPort: true,   // Fail if port 3000 is already in use
  },
});