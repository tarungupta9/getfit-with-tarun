import netlify from '@netlify/vite-plugin-tanstack-start'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
      },
    }),
    ...(command === 'build' ? [netlify()] : []),
    react(),
  ],
}))
