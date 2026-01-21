import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools' // 暂时禁用，避免CSP问题

// https://vite.dev/config/
export default defineConfig({
  base: '/bridge/',  // <--- 【关键修改】必须和你的部署路径一致
  plugins: [
    vue(),
    // vueDevTools(), // 暂时禁用
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
