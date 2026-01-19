// 告警管理 API
import { get, post, put, del } from '../request'

/**
 * 获取告警列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.status - 状态筛选 (0/1/2/all)
 * @param {number} params.bridgeId - 桥梁ID筛选
 * @param {number} params.sectionId - 主跨ID筛选
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.keyword - 搜索关键词
 */
export const getAlarmList = (params) => {
  return get('/api/alarm/list', params)
}

/**
 * 获取告警详情
 * @param {number} id - 告警ID
 */
export const getAlarmById = (id) => {
  return get(`/api/alarm/${id}`)
}

/**
 * 更新告警状态
 * @param {number} id - 告警ID
 * @param {Object} data - 更新数据
 * @param {number} data.status - 新状态 (0/1/2)
 * @param {string} data.remark - 备注
 */
export const updateAlarmStatus = (id, data) => {
  return put(`/api/alarm/${id}/status`, data)
}

/**
 * 批量更新告警状态
 * @param {Object} data
 * @param {Array<number>} data.ids - 告警ID数组
 * @param {number} data.status - 新状态 (0/1/2)
 */
export const batchUpdateStatus = (data) => {
  return put('/api/alarm/batch/status', data)
}

/**
 * 删除告警
 * @param {number} id - 告警ID
 */
export const deleteAlarm = (id) => {
  return del(`/api/alarm/${id}`)
}

/**
 * 批量删除告警
 * @param {Array<number>} ids - 告警ID数组
 */
export const batchDeleteAlarms = (ids) => {
  return del('/api/alarm/batch/delete', { ids })
}

/**
 * 获取告警统计
 * @param {Object} params - 查询参数
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {number} params.bridgeId - 桥梁ID
 */
export const getAlarmStatistics = (params) => {
  return get('/api/alarm/statistics/overview', params)
}
