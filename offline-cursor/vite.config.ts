import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    root: 'src',
    server: {
      port: 5173,
      strictPort: true
    },
    build: {
      outDir: '../dist/renderer',
      emptyOutDir: true
    }
  }
})

