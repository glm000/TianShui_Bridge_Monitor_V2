// src/api/analysis.js - 数据分析API封装
import { get, baseUrl } from '../request.js'

/**
 * 查询历史数据（分页）
 * @param {Object} params - { bridgeId, sectionId, sensorCode, startTime, endTime, page, pageSize }
 */
export const getHistoryData = (params) => {
  return get('/api/analysis/history', params)
}

/**
 * 获取统计数据
 * @param {Object} params - { sensorCode, startTime, endTime }
 */
export const getStatistics = (params) => {
  return get('/api/analysis/statistics', params)
}

/**
 * 获取趋势数据
 * @param {Object} params - { sensorCode, startTime, endTime, granularity }
 */
export const getTrendData = (params) => {
  return get('/api/analysis/trend', params)
}

/**
 * 获取数据分布
 * @param {Object} params - { sensorCode, startTime, endTime, bins }
 */
export const getDistribution = (params) => {
  return get('/api/analysis/distribution', params)
}

/**
 * 多传感器对比
 * @param {Object} params - { sensorCodes, startTime, endTime, granularity }
 */
export const getCompareData = (params) => {
  return get('/api/analysis/compare', params)
}

/**
 * 告警历史查询
 * @param {Object} params - { bridgeId, sensorCode, startTime, endTime, isHandled, page, pageSize }
 */
export const getAlarmHistory = (params) => {
  return get('/api/analysis/alarms', params)
}

/**
 * 告警统计
 * @param {Object} params - { startTime, endTime }
 */
export const getAlarmStats = (params) => {
  return get('/api/analysis/alarm-stats', params)
}

/**
 * 导出数据（返回CSV文件）
 * @param {Object} params - { bridgeId, sectionId, sensorCode, startTime, endTime }
 */
export const exportData = (params) => {
  // 构建查询字符串
  const queryString = new URLSearchParams(params).toString()
  // 返回完整URL供前端触发下载
  return `${baseUrl}/api/analysis/export?${queryString}`
}
