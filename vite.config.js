import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    // npm run dev (React, port 5173) forwards /api calls to the Hono Worker
    // started with npm run dev:api (port 8787).
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})