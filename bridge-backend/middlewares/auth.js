// middlewares/auth.js - 权限验证中间件
const db = require('../config/db')
const jwt = require('jsonwebtoken') // 引入 JWT 库

// 必须和 userController.js 里的密钥完全一致！
const JWT_SECRET = process.env.JWT_SECRET || 'bridge_monitor_secret_key_2026'

/**
 * 验证用户是否登录（JWT 标准验证）
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // 1. 从请求头获取 token (去掉 Bearer 前缀)
    const token = req.headers['authorization']?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      })
    }

    // 2. 【核心修改】使用 jwt.verify 验证真 Token
    // 这步如果失败（比如密钥不对、过期），会直接抛出错误，进入 catch 块
    const decoded = jwt.verify(token, JWT_SECRET)

    // 3. (可选但推荐) 去数据库查一下用户还在不在，防止用户被删了还能用
    const [users] = await db.query('SELECT id, username, real_name, role, status FROM sys_users WHERE id = ?', [decoded.id])

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    const user = users[0]

    // 4. 检查用户状态
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用'
      })
    }

    // 5. 将用户信息挂载到 req 对象上
    req.user = user
    next()
  } catch (error) {
    console.error('认证失败:', error.message)
    // 细分错误类型给前端更友好的提示
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' })
    }
    return res.status(401).json({
      success: false,
      message: '身份令牌无效'
    })
  }
}

/**
 * 验证用户是否为管理员 (保持不变)
 */
exports.requireAdmin = async (req, res, next) => {
  // 复用上面的 requireAuth，确保先登录
  // 注意：这里需要手动调用一下，或者直接用 verifyToken 的逻辑，
  // 但通常路由写法是 router.get(..., requireAuth, requireAdmin, ...)
  // 如果你的路由是那样写的，这里其实只需要检查 req.user 即可。
  // 为了兼容你原来的写法（嵌套调用）：

  if (!req.user) {
    // 如果还没经过 requireAuth，手动调一次
    return exports.requireAuth(req, res, () => {
      checkAdmin(req, res, next)
    })
  } else {
    checkAdmin(req, res, next)
  }
}

const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '权限不足，需要管理员权限'
    })
  }
  next()
}

/**
 * 验证用户角色 (保持不变)
 */
exports.requireRole = allowedRoles => {
  return async (req, res, next) => {
    const check = () => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `权限不足，需要 ${allowedRoles.join(' 或 ')} 权限`
        })
      }
      next()
    }

    if (!req.user) {
      return exports.requireAuth(req, res, check)
    } else {
      check()
    }
  }
}
