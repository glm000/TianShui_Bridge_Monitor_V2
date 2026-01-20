// src/api/settings.js - 系统设置API封装
import { get, post, put, del } from '../request.js'

// ===================== 桥梁管理 =====================

// 获取所有桥梁列表
export const getAllBridges = () => {
  return get('/settings/bridges')
}

// 获取单个桥梁详情
export const getBridgeById = id => {
  return get(`/settings/bridges/${id}`)
}

// 新增桥梁
export const createBridge = data => {
  return post('/settings/bridges', data)
}

// 修改桥梁
export const updateBridge = (id, data) => {
  return put(`/settings/bridges/${id}`, data)
}

// 删除桥梁
export const deleteBridge = id => {
  return del(`/settings/bridges/${id}`)
}

// ===================== 主跨管理 =====================

// 获取指定桥梁下的主跨列表
export const getSectionsByBridge = bridgeId => {
  return get('/settings/sections', { bridgeId })
}

// 获取单个主跨详情
export const getSectionById = id => {
  return get(`/settings/sections/${id}`)
}

// 新增主跨
export const createSection = data => {
  return post('/settings/sections', data)
}

// 修改主跨
export const updateSection = (id, data) => {
  return put(`/settings/sections/${id}`, data)
}

// 删除主跨
export const deleteSection = id => {
  return del(`/settings/sections/${id}`)
}

// ===================== 传感器管理 =====================

// 获取指定主跨下的传感器列表
export const getSensorsBySection = sectionId => {
  return get('/settings/sensors', { sectionId })
}

// 获取单个传感器详情
export const getSensorById = id => {
  return get(`/settings/sensors/${id}`)
}

// 新增传感器
export const createSensor = data => {
  return post('/settings/sensors', data)
}

// 修改传感器
export const updateSensor = (id, data) => {
  return put(`/settings/sensors/${id}`, data)
}

// 删除传感器
export const deleteSensor = id => {
  return del(`/settings/sensors/${id}`)
}
