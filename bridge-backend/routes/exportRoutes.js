// 数据导出路由
const express = require('express')
const router = express.Router()
const exportController = require('../controllers/exportController')
const { requireAuth } = require('../middlewares/auth')

// 所有导出接口都需要认证
router.use(requireAuth)

// 导出告警数据
router.get('/alarms', exportController.exportAlarms)

// 导出传感器数据
router.get('/sensor-data', exportController.exportSensorData)

// 导出操作日志
router.get('/logs', exportController.exportLogs)

module.exports = router
