import { get, del, post } from '../request.js'

// 获取日志列表
export const getLogList = (params) => {
  return get('/user/logs', params)
}

// 获取操作类型列表
export const getActionTypes = () => {
  return get('/user/logs/action-types')
}

// 获取用户名列表
export const getLogUsers = () => {
  return get('/user/logs/users')
}

// 获取日志统计
export const getLogStatistics = () => {
  return get('/user/logs/statistics')
}

// 删除单条日志
export const deleteLog = (id) => {
  return del(`/user/logs/${id}`)
}

// 批量删除日志
export const batchDeleteLogs = (ids) => {
  return post('/user/logs/batch-delete', { ids })
}
