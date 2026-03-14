import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
  environment: 'jsdom',
  globals: true,
   include: ['src/**/*.{test,spec}.{ts,tsx}'], 
  exclude: ['**/node_modules/**', '**/e2e/**'], 
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'], 
    exclude: ['node_modules/', 'e2e/'],
  },
},
})