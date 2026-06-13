import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Tests share one Postgres database and reset tables between cases —
    // run sequentially to avoid cross-file/cross-test races.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
