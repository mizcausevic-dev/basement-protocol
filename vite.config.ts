import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = import.meta.dirname

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(root, 'src') },
  },
  server: { host: '0.0.0.0', port: 47321, strictPort: true },
  preview: { host: '0.0.0.0', port: 47322, strictPort: true },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        article: resolve(root, 'article.html'),
        media: resolve(root, 'media.html'),
      },
    },
  },
})
