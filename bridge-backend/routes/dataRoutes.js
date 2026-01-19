const express = require('express')
const router = express.Router()
const controller = require('../controllers/dataController')
const { requireAuth } = require('../middlewares/auth')

router.get('/history', controller.getSensorHistory)
router.get('/alarms', controller.getAlarms)

// 删除接口需要认证
router.delete('/sensor-data/:id', requireAuth, controller.deleteSensorData)
router.post('/sensor-data/batch-delete', requireAuth, controller.batchDeleteSensorData)

module.exports = router
