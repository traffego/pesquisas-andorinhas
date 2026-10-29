import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: ['es2020', 'chrome80', 'safari13.1', 'edge80'],
    cssTarget: ['chrome80', 'safari13.1', 'edge80'],
  },
})

