const express = require('express')
const router = express.Router()
const controller = require('../controllers/alarmController')

// 获取告警列表（支持分页、筛选）
router.get('/list', controller.getAlarmList)

// 获取告警统计
router.get('/statistics/overview', controller.getAlarmStatistics)

// 批量更新告警状态（必须在 /:id/status 之前）
router.put('/batch/status', controller.batchUpdateStatus)

// 批量删除告警（必须在 /:id 之前）
router.delete('/batch/delete', controller.batchDeleteAlarms)

// 获取告警详情
router.get('/:id', controller.getAlarmById)

// 更新告警状态
router.put('/:id/status', controller.updateAlarmStatus)

// 删除告警
router.delete('/:id', controller.deleteAlarm)

module.exports = router
