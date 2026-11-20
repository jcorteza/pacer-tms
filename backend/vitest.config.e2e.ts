import { defineConfig } from 'vitest/config';

// E2E specs run the real Nest app against the throwaway pacer_test database.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['src/db/test/global-setup.ts'],
    // Points DATABASE_URL at pacer_test before AppModule is imported.
    setupFiles: ['test/support/use-test-database.ts'],
    // All specs share one database, so files must not run concurrently.
    fileParallelism: false,
  },
});
