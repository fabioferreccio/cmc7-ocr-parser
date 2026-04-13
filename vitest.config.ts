import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-helpers/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/dev-tools/**'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});

