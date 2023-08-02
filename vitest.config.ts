import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul', // or 'v8'
      reporter: ['text', 'json-summary', 'json'],
      all: true,
      include: ['src/**'],
      reportsDirectory: './coverage',
    },
  },
})