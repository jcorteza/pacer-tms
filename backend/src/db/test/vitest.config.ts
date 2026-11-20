import { defineConfig } from 'vitest/config';

// DB integration tests against a real Postgres. Run from backend/ via `pnpm test:db`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/db/test/**/*.spec.ts'],
    globalSetup: ['src/db/test/global-setup.ts'],
    // All specs share one throwaway database, so files must not run concurrently.
    fileParallelism: false,
  },
});
