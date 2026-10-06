import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // each test file boots its own embedded MongoDB (mongodb-memory-server)
    fileParallelism: true,
    env: { NODE_ENV: 'test' },
  },
});
