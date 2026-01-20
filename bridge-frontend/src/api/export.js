// 数据导出 API
import { get } from '../request.js'

/**
 * 导出告警数据
 * @param {Object} params 查询参数
 * @returns {Promise<Blob>}
 */
export const exportAlarms = (params) => {
  return get('/export/alarms', params, { responseType: 'blob' })
}

/**
 * 导出传感器数据
 * @param {Object} params 查询参数
 * @returns {Promise<Blob>}
 */
export const exportSensorData = (params) => {
  return get('/export/sensor-data', params, { responseType: 'blob' })
}

/**
 * 导出操作日志
 * @param {Object} params 查询参数
 * @returns {Promise<Blob>}
 */
export const exportLogs = (params) => {
  return get('/export/logs', params, { responseType: 'blob' })
}
