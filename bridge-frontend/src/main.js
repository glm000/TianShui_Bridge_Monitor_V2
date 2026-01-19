/* src/main.js */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 1. 引入 Element Plus 及其样式文件
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn' // 引入中文语言包

import App from './App.vue'
import router from './router'

import './assets/main.css' // 保持默认样式引用，防报错

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 2. 告诉 Vue 我们要用 Element Plus，并配置中文语言
app.use(ElementPlus, {
  locale: zhCn
})

app.mount('#app')
