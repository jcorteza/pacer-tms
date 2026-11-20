import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // DB integration tests have their own config (src/db/test/vitest.config.ts).
    exclude: ['**/node_modules/**', 'src/db/test/**'],
  },
});
