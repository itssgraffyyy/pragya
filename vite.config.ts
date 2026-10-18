import { offlineShell } from './build/offlineShell';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), offlineShell()],
  base: './', // relative paths so the built app runs offline from any location
  build: {
    target: 'es2021',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    globals: true,
    environment: 'node',
    // DOM setup is imported only by component tests; core tests need no browser globals.
    include: ['src/tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
