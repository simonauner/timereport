import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts, so tests run without the app's plugins.
export default defineConfig({
    test: { include: ['src/**/*.test.ts'] },
});
