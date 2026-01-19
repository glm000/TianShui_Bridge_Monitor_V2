// routes/settingsRoutes.js - 系统设置路由
const express = require('express')
const router = express.Router()
const controller = require('../controllers/settingsController')

// ===================== 桥梁管理路由 =====================
router.get('/bridges', controller.getAllBridges)
router.get('/bridges/:id', controller.getBridgeById)
router.post('/bridges', controller.createBridge)
router.put('/bridges/:id', controller.updateBridge)
router.delete('/bridges/:id', controller.deleteBridge)

// ===================== 主跨管理路由 =====================
router.get('/sections', controller.getSectionsByBridge)
router.get('/sections/:id', controller.getSectionById)
router.post('/sections', controller.createSection)
router.put('/sections/:id', controller.updateSection)
router.delete('/sections/:id', controller.deleteSection)

// ===================== 传感器管理路由 =====================
router.get('/sensors', controller.getSensorsBySection)
router.get('/sensors/:id', controller.getSensorById)
router.post('/sensors', controller.createSensor)
router.put('/sensors/:id', controller.updateSensor)
router.delete('/sensors/:id', controller.deleteSensor)

module.exports = router
