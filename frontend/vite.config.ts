import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiProxy = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:17325';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/projects': apiProxy,
      '/health': apiProxy,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
