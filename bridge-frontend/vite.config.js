import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools' // 暂时禁用，避免CSP问题

// https://vite.dev/config/
export default defineConfig({
  // 【新增】这一行非常关键！设置基础路径
  base: '/bridge/',
  plugins: [
    vue(),
    // vueDevTools(), // 暂时禁用
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
