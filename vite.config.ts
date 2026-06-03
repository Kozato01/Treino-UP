import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@resources': path.resolve(__dirname, './resources'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
