import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    minify: false, // Temporarily disable minification to see real errors
    sourcemap: true,
  },
})