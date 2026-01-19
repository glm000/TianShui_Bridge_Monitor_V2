const express = require('express')
const router = express.Router()
const controller = require('../controllers/userController')

// ===== 登录相关 =====
router.post('/login', controller.login)

// ===== 日志管理 =====
router.get('/logs', controller.getLogs)
router.get('/logs/action-types', controller.getActionTypes)
router.get('/logs/users', controller.getLogUsers)
router.get('/logs/statistics', controller.getLogStatistics)
router.delete('/logs/:id', controller.deleteLog)
router.post('/logs/batch-delete', controller.batchDeleteLogs)

// ===== 用户管理 =====
router.get('/list', controller.getUserList)
router.get('/:id', controller.getUserById)
router.post('/create', controller.createUser)
router.put('/:id', controller.updateUser)
router.delete('/:id', controller.deleteUser)
router.put('/:id/password', controller.resetPassword)
router.put('/:id/status', controller.updateStatus)

module.exports = router
