const express = require('express')
const router = express.Router()
const controller = require('../controllers/analysisController')

// 历史数据查询（分页）
router.get('/history', controller.getHistory)

// 统计数据
router.get('/statistics', controller.getStatistics)

// 趋势数据
router.get('/trend', controller.getTrend)

// 数据分布
router.get('/distribution', controller.getDistribution)

// 多传感器对比
router.get('/compare', controller.getCompare)

// 告警历史查询
router.get('/alarms', controller.getAlarms)

// 告警统计
router.get('/alarm-stats', controller.getAlarmStats)

// 导出数据
router.get('/export', controller.exportData)

module.exports = router
