// src/api/user.js - 用户管理API封装
import { get, post, put, del } from '../request.js'

// ===================== 用户管理 =====================

/**
 * 获取用户列表（支持分页和搜索）
 * @param {Object} params - { page, pageSize, keyword, role }
 */
export const getUserList = (params) => {
  return get('/api/user/list', params)
}

/**
 * 获取单个用户详情
 * @param {Number} id - 用户ID
 */
export const getUserById = (id) => {
  return get(`/api/user/${id}`)
}

/**
 * 新增用户
 * @param {Object} data - { username, password, real_name, role, phone, email }
 */
export const createUser = (data) => {
  return post('/api/user/create', data)
}

/**
 * 修改用户信息
 * @param {Number} id - 用户ID
 * @param {Object} data - { real_name, role, phone, email, status }
 */
export const updateUser = (id, data) => {
  return put(`/api/user/${id}`, data)
}

/**
 * 删除用户
 * @param {Number} id - 用户ID
 */
export const deleteUser = (id) => {
  return del(`/api/user/${id}`)
}

/**
 * 重置用户密码
 * @param {Number} id - 用户ID
 * @param {String} newPassword - 新密码
 */
export const resetUserPassword = (id, newPassword) => {
  return put(`/api/user/${id}/password`, { password: newPassword })
}

/**
 * 修改用户状态（启用/禁用）
 * @param {Number} id - 用户ID
 * @param {Number} status - 状态 (1:启用 0:禁用)
 */
export const updateUserStatus = (id, status) => {
  return put(`/api/user/${id}/status`, { status })
}
