import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.js'],
      exclude: ['src/tests/**', 'node_modules/**'],
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
    },
    testTimeout: 30000,
  },
});
