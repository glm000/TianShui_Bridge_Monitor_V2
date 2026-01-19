const express = require('express')
const router = express.Router()
const controller = require('../controllers/dashboardController')

// 统计概览
router.get('/overview', controller.getOverview)

// 完整桥梁结构树
router.get('/bridges-with-sensors', controller.getBridgesWithSensors)

// 所有传感器实时数据
router.get('/realtime', controller.getRealTimeData)

// 单个传感器最新N条数据
router.get('/sensor-latest', controller.getSensorLatest)

module.exports = router
