// app.js

// 加载环境变量 读根目录下的 .env 文件
/*
 * 1. 加载环境变量
 * 必须放在代码的最最第一行！
 */
require('dotenv').config() // 必须在第一行

/*
 * 2. 引入第三方工具包 (从 node_modules 里拿)
 */
const express = require('express') // 核心框架
const cors = require('cors') // 跨域插件
const bodyParser = require('body-parser') // 处理请求体的插件
/*
 * 3. 引入自定义工具包 (自己写的)
 */
const mockTask = require('./utils/mockTask') // 那个自动造假数据的“机器人”  模拟数据任务

// 引入各路由模块
const bridgeRoutes = require('./routes/bridgeRoutes') // 桥梁业务相关路由
const dataRoutes = require('./routes/dataRoutes') // 数据业务相关路由
const userRoutes = require('./routes/userRoutes') // 用户业务相关路由
const dashboardRoutes = require('./routes/dashboardRoutes') // 监控大屏相关路由
const settingsRoutes = require('./routes/settingsRoutes') // 系统设置相关路由
const analysisRoutes = require('./routes/analysisRoutes') // 数据分析相关路由
const alarmRoutes = require('./routes/alarmRoutes') // 告警管理相关路由
const exportRoutes = require('./routes/exportRoutes') // 数据导出相关路由

const app = express() // 创建一个 Express 应用实例
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors()) // 允许跨域
app.use(bodyParser.json()) // 解析 JSON 请求体，前端发过来的数据通常是 JSON 格式的字符串，
// 注册路由前缀
app.use('/api/bridge', bridgeRoutes) //如果前端的请求是以 /api/bridge 开头的，就让他去找 bridgeRoutes
app.use('/api/data', dataRoutes) //如果前端的请求是以 /api/data 开头的，去找 dataRoutes
app.use('/api/user', userRoutes) //如果前端的请求是以 /api/user 开头的，去找 userRoutes
app.use('/api/dashboard', dashboardRoutes) //如果前端的请求是以 /api/dashboard 开头的，去找 dashboardRoutes
app.use('/api/settings', settingsRoutes) //如果前端的请求是以 /api/settings 开头的，去找 settingsRoutes
app.use('/api/analysis', analysisRoutes) //如果前端的请求是以 /api/analysis 开头的，去找 analysisRoutes
app.use('/api/alarm', alarmRoutes) //如果前端的请求是以 /api/alarm 开头的，去找 alarmRoutes
app.use('/api/export', exportRoutes) //如果前端的请求是以 /api/export 开头的，去找 exportRoutes

/*
 * 启动那个每10秒造一次数据的机器人
 * 注意：它不需要等待请求，它自己会在后台一直跑
 */
// 启动模拟任务
mockTask()

// 启动服务  正式开门迎客迎接各个前端请求
app.listen(PORT, () => {
  console.log(`\n==================================================`)
  console.log(`🚀 后端服务启动成功! 端口: ${PORT}`)
  console.log(`--------------------------------------------------`)
  console.log(`🗺️  GIS接口:   http://localhost:${PORT}/api/bridge/map`)
  console.log(`🌳 拓扑接口:   http://localhost:${PORT}/api/bridge/tree`)
  console.log(`📈 历史数据:   http://localhost:${PORT}/api/data/history?code=B1_MID_STR_01`)
  console.log(`👤 登录接口:   http://localhost:${PORT}/api/user/login (POST)`)
  console.log(`📊 大屏概览:   http://localhost:${PORT}/api/dashboard/overview`)
  console.log(`==================================================\n`)
})
