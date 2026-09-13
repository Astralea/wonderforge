/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input: { main: 'index.html', eiffelCrane: 'eiffel-crane.html' } } },
  test: {
    environment: 'node',
    setupFiles: ['tests/helpers/png-image-bitmap.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
