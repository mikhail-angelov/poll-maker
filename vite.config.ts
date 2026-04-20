import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact({
    // Enable babel to avoid the transform-hook-names plugin issue with zimmerframe
    babel: {
      // Empty config to enable babel mode
    }
  })],
  build: {
    outDir: 'dist/client',
    emptyOutDir: false
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['dist/**', '**/*.test.js', 'node_modules/**']
  },
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  }
});
