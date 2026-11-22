import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps the static build portable (GitHub Pages later; no deploy now).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as never)
