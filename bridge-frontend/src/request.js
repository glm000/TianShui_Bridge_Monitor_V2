// src/request.js
import axios from 'axios'

// 统一管理后端基础地址
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/bridge-api'

export { baseUrl }

// 1. 创建 axios 实例 (比直接用 axios 更规范)
const service = axios.create({
  baseURL: baseUrl,
  timeout: 10000 // 请求超时时间
})

// 2. 请求拦截器：自动添加真正的 token
service.interceptors.request.use(
  config => {
    // 【关键修改】尝试从多个常见的 Key 获取真正的 Token
    // 你可以在浏览器 F12 -> Application -> Local Storage 里看一眼到底存的是哪个名字
    const token = localStorage.getItem('token') || localStorage.getItem('Authorization') || localStorage.getItem('Admin-Token')

    if (token) {
      // 如果 token 本身已经包含了 "Bearer " 前缀，就直接用
      // 如果没有，通常需要加上 "Bearer " (取决于你的后端要求，一般加上比较稳妥)
      // 这里做一个简单的判断：
      const finalToken = token.startsWith('Bearer') ? token : `Bearer ${token}`

      config.headers['Authorization'] = finalToken
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 3. 响应拦截器 (建议加上，方便排查错误)
service.interceptors.response.use(
  response => {
    return response
  },
  error => {
    // 统一打印错误，方便调试
    console.error('请求出错:', error)
    return Promise.reject(error)
  }
)

// -------------------------------------------
// 导出通用的请求方法 (保持和你原来的函数签名一致，兼容旧代码)
// -------------------------------------------

// 极简POST
export const post = (url, data) => {
  return service.post(url, data)
}

// GET (关键：config 透传)
export const get = (url, params, config = {}) => {
  // 注意：axios 的 get 第二个参数是 config，params 也是 config 的一部分
  // 你的 export.js 传了 { responseType: 'blob' }，这里需要正确合并
  return service.get(url, {
    params,
    ...config // 这样 responseType: 'blob' 才能生效
  })
}

// PUT
export const put = (url, data) => {
  return service.put(url, data)
}

// DELETE
export const del = (url, data) => {
  return service.delete(url, { data })
}

// 导出默认实例
export default service
