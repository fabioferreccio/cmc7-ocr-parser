import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom para simular browser APIs (Canvas, MediaDevices, etc.)
    environment: 'jsdom',
    // Colocação: testes junto ao source (docs/05-regras.md §3.3)
    include: ['src/**/*.test.ts', 'poc/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    globals: false,
    // Setup file para mocks globais
    setupFiles: ['src/test-helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-helpers/**',
        'src/react.ts',
        'src/vue.ts',
        'src/workers/**', // Workers testados via integração
      ],
      thresholds: {
        // Thresholds globais (docs/05-regras.md §3.4)
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      reporter: ['text', 'html', 'lcov'],
    },
    // Timeout para testes com WASM mock
    testTimeout: 10_000,
    // Memória limitada para detectar vazamentos (Regra 6.4)
    pool: 'forks',
  },
});
