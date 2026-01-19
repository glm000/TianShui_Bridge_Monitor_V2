// src/request.js
import axios from 'axios'

// 统一管理后端基础地址
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

// 导出 baseUrl 供其他模块使用
export { baseUrl }

// 请求拦截器：自动添加 token
axios.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token（如果存在）
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user.id) {
          // 添加 token 到请求头
          config.headers['Authorization'] = `Bearer mock_token_${user.id}`
        }
      } catch (e) {
        console.error('解析用户信息失败:', e)
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 极简POST请求方法
export const post = (url, data) => {
  return axios.post(baseUrl + url, data)
}

// GET请求方法
export const get = (url, params, config = {}) => {
  return axios.get(baseUrl + url, { params, ...config })
}

// PUT请求方法
export const put = (url, data) => {
  return axios.put(baseUrl + url, data)
}

// DELETE请求方法
export const del = (url, data) => {
  return axios.delete(baseUrl + url, { data })
}
