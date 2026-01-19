//routes/ (路由层) —— 服务员（点餐员）这是最先接触到“客人请求也就是前端页面请求”的地方。
//routes/ (路由层)不负责具体的业务逻辑，它只是个交通指挥官。它确保客人的需求能找到正确的负责人
const express = require('express')
const router = express.Router()
const controller = require('../controllers/bridgeController')

router.get('/map', controller.getMapBridges)
router.get('/tree', controller.getStructureTree)
router.get('/visual/bridge/:id', controller.getBridgeVisual)
router.get('/visual/section/:id', controller.getSectionVisual)

module.exports = router
