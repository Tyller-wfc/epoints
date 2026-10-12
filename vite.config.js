import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // 禁用 sourcemap 减小打包内存占用
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 react 和 lucide 分离，避免单个 chunk 内存分析过大
          'react-vendor': ['react', 'react-dom'],
          'lucide-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})