import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolves the `@/` alias from tsconfig, so tests import modules by the
    // same specifier the application uses. Native since Vite 8 — the
    // vite-tsconfig-paths plugin is no longer needed for this.
    tsconfigPaths: true,
  },
  test: {
    // Everything under test is server-side logic — path resolution, format
    // detection, counters. No DOM, so no jsdom and no React plugin.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
