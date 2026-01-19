// middlewares/auth.js - 权限验证中间件
const db = require('../config/db')

/**
 * 验证用户是否登录（简单的 token 验证）
 * 实际生产环境应使用 JWT
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const token = req.headers['authorization']?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      })
    }
    
    // 简单验证：从 token 中提取用户ID（实际应使用 JWT）
    const userId = token.replace('mock_token_', '')
    
    // 查询用户信息
    const [users] = await db.query(
      'SELECT id, username, real_name, role, status FROM sys_users WHERE id = ?',
      [userId]
    )
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const user = users[0]
    
    // 检查用户状态
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用'
      })
    }
    
    // 将用户信息挂载到 req 对象上，供后续使用
    req.user = user
    next()
  } catch (error) {
    console.error('认证失败:', error)
    res.status(500).json({
      success: false,
      message: '认证失败'
    })
  }
}

/**
 * 验证用户是否为管理员
 */
exports.requireAdmin = async (req, res, next) => {
  try {
    // 先验证登录
    await exports.requireAuth(req, res, () => {
      // 检查是否为管理员
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足，需要管理员权限'
        })
      }
      next()
    })
  } catch (error) {
    console.error('权限验证失败:', error)
    res.status(500).json({
      success: false,
      message: '权限验证失败'
    })
  }
}

/**
 * 验证用户角色（可传入多个角色）
 * @param {Array} allowedRoles - 允许的角色列表，如 ['admin', 'user']
 */
exports.requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      await exports.requireAuth(req, res, () => {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: `权限不足，需要 ${allowedRoles.join(' 或 ')} 权限`
          })
        }
        next()
      })
    } catch (error) {
      console.error('角色验证失败:', error)
      res.status(500).json({
        success: false,
        message: '角色验证失败'
      })
    }
  }
}
