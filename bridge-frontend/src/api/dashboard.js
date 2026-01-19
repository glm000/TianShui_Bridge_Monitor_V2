// src/api/dashboard.js - 监控大屏API封装
import { get } from '../request.js'

// 获取统计概览
export const getOverview = () => {
  return get('/api/dashboard/overview')
}

// 获取完整桥梁结构树
export const getBridgesWithSensors = () => {
  return get('/api/dashboard/bridges-with-sensors')
}

// 获取所有传感器实时数据
export const getRealTimeData = () => {
  return get('/api/dashboard/realtime')
}

// 获取单个传感器最新N条数据
export const getSensorLatest = (code, limit = 30) => {
  return get('/api/dashboard/sensor-latest', { code, limit })
}

// 获取最新告警列表
export const getAlarms = () => {
  return get('/api/data/alarms')
}
