// 负责登录与日志和用户管理
const db = require('../config/db')
const bcrypt = require('bcryptjs')
// 1. 【新增】引入 JWT 库
const jwt = require('jsonwebtoken')

// ===================== 登录相关 =====================

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body

    // 1. 查询用户
    const [users] = await db.query('SELECT * FROM sys_users WHERE username = ?', [username])

    if (users.length === 0) {
      // 为了安全，通常不告诉用户是账号错还是密码错，但在内网系统可以明确点
      return res.status(200).json({ success: false, message: '账号不存在' })
    }

    const user = users[0]

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(200).json({ success: false, message: '密码错误' })
    }

    // 3. 【新增】生成 JWT Token
    // 注意：secret key 应该放在环境变量里，这里为了方便直接写了字符串
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'bridge_monitor_secret_key_2026', // 密钥
      { expiresIn: '24h' } // 过期时间
    )

    // 4. 记录登录日志
    await db.query('INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)', [user.id, user.username, 'LOGIN', req.ip || req.connection.remoteAddress, '用户登录成功'])

    // 5. 更新最后登录时间
    await db.query('UPDATE sys_users SET last_login_at = NOW() WHERE id = ?', [user.id])

    // 6. 返回用户信息 + Token
    delete user.password

    res.json({
      success: true,
      message: '登录成功',
      token: token, // <--- 关键！把 Token 发给前端
      user: user
    })
  } catch (err) {
    console.error('登录失败:', err)
    res.status(500).json({ success: false, message: '服务器错误: ' + err.message })
  }
}

// 获取操作日志（支持分页、筛选、搜索）
exports.getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      action = '', // 操作类型筛选
      username = '', // 用户名筛选
      startDate = '', // 开始日期
      endDate = '', // 结束日期
      keyword = '' // 关键词搜索（搜索用户名、详情）
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    // 构建查询条件
    let whereClause = '1=1'
    const params = []

    // 操作类型筛选
    if (action) {
      whereClause += ' AND action = ?'
      params.push(action)
    }

    // 用户名筛选
    if (username) {
      whereClause += ' AND username = ?'
      params.push(username)
    }

    // 时间范围筛选
    if (startDate) {
      whereClause += ' AND created_at >= ?'
      params.push(startDate + ' 00:00:00')
    }
    if (endDate) {
      whereClause += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }

    // 关键词搜索
    if (keyword) {
      whereClause += ' AND (username LIKE ? OR details LIKE ? OR ip_addr LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM sys_logs WHERE ${whereClause}`
    const [countResult] = await db.query(countSql, params)
    const total = countResult[0].total

    // 获取列表
    const listSql = `
      SELECT 
        id, 
        user_id, 
        username, 
        action, 
        ip_addr, 
        details, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM sys_logs 
      WHERE ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    const [list] = await db.query(listSql, params)

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    })
  } catch (err) {
    console.error('获取日志列表失败:', err)
    res.status(500).json({
      success: false,
      message: '获取日志列表失败: ' + err.message
    })
  }
}

// 获取操作类型列表
exports.getActionTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT action FROM sys_logs WHERE action IS NOT NULL ORDER BY action')
    const actionTypes = rows.map(row => row.action)
    res.json({ success: true, data: actionTypes })
  } catch (err) {
    console.error('获取操作类型失败:', err)
    res.status(500).json({
      success: false,
      message: '获取操作类型失败: ' + err.message
    })
  }
}

// 获取用户名列表（用于筛选）
exports.getLogUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT username FROM sys_logs WHERE username IS NOT NULL ORDER BY username')
    const usernames = rows.map(row => row.username)
    res.json({ success: true, data: usernames })
  } catch (err) {
    console.error('获取用户列表失败:', err)
    res.status(500).json({
      success: false,
      message: '获取用户列表失败: ' + err.message
    })
  }
}

// 日志统计
exports.getLogStatistics = async (req, res) => {
  try {
    // 今日日志数
    const [todayCount] = await db.query('SELECT COUNT(*) as count FROM sys_logs WHERE DATE(created_at) = CURDATE()')

    // 最近登录次数（24小时）
    const [loginCount] = await db.query("SELECT COUNT(*) as count FROM sys_logs WHERE action = 'LOGIN' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)")

    // 最活跃用户（最近一周）
    const [activeUsers] = await db.query(`
      SELECT username, COUNT(*) as count 
      FROM sys_logs 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) AND username IS NOT NULL
      GROUP BY username 
      ORDER BY count DESC 
      LIMIT 5
    `)

    // 操作类型分布（最近一周）
    const [actionStats] = await db.query(`
      SELECT action, COUNT(*) as count 
      FROM sys_logs 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) AND action IS NOT NULL
      GROUP BY action 
      ORDER BY count DESC
    `)

    res.json({
      success: true,
      data: {
        todayCount: todayCount[0].count,
        loginCount: loginCount[0].count,
        activeUsers,
        actionStats
      }
    })
  } catch (err) {
    console.error('获取日志统计失败:', err)
    res.status(500).json({
      success: false,
      message: '获取日志统计失败: ' + err.message
    })
  }
}

// ===================== 用户管理 =====================

/**
 * 获取用户列表（支持分页和搜索）
 */
exports.getUserList = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', role = '' } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    // 构建查询条件
    let whereClause = ''
    const params = []

    if (keyword) {
      whereClause += ' AND (username LIKE ? OR real_name LIKE ? OR phone LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (role) {
      whereClause += ' AND role = ?'
      params.push(role)
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM sys_users WHERE 1=1 ${whereClause}`
    const [countResult] = await db.query(countSql, params)
    const total = countResult[0].total

    // 获取列表
    const listSql = `
      SELECT 
        id, username, real_name, role, phone, email, status,
        last_login_at as last_login,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM sys_users 
      WHERE 1=1 ${whereClause}
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    const [list] = await db.query(listSql, params)

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.json({
      success: false,
      message: '获取用户列表失败: ' + error.message
    })
  }
}

/**
 * 获取单个用户详情
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params
    const [users] = await db.query(
      `SELECT id, username, real_name, role, phone, email, status, 
       last_login_at as last_login, created_at 
       FROM sys_users WHERE id = ?`,
      [id]
    )

    if (users.length === 0) {
      return res.json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      data: users[0]
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    res.json({
      success: false,
      message: '获取用户详情失败: ' + error.message
    })
  }
}

/**
 * 新增用户
 */
exports.createUser = async (req, res) => {
  try {
    const { username, password, real_name, role = 'guest', phone, email } = req.body

    // 验证必填字段
    if (!username || !password || !real_name) {
      return res.json({
        success: false,
        message: '用户名、密码和姓名为必填项'
      })
    }

    // 检查用户名是否已存在
    const [existUsers] = await db.query('SELECT id FROM sys_users WHERE username = ?', [username])
    if (existUsers.length > 0) {
      return res.json({
        success: false,
        message: '用户名已存在'
      })
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)

    // 插入新用户
    const sql = `
      INSERT INTO sys_users 
      (username, password, real_name, role, phone, email, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    `
    const [result] = await db.query(sql, [username, hashedPassword, real_name, role, phone || null, email || null])

    res.json({
      success: true,
      message: '用户创建成功',
      data: { id: result.insertId }
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    res.json({
      success: false,
      message: '创建用户失败: ' + error.message
    })
  }
}

/**
 * 修改用户信息
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { real_name, role, phone, email, status } = req.body

    // 检查用户是否存在
    const [users] = await db.query('SELECT id FROM sys_users WHERE id = ?', [id])
    if (users.length === 0) {
      return res.json({
        success: false,
        message: '用户不存在'
      })
    }

    // 构建更新语句
    const updates = []
    const params = []

    if (real_name !== undefined) {
      updates.push('real_name = ?')
      params.push(real_name)
    }
    if (role !== undefined) {
      updates.push('role = ?')
      params.push(role)
    }
    if (phone !== undefined) {
      updates.push('phone = ?')
      params.push(phone)
    }
    if (email !== undefined) {
      updates.push('email = ?')
      params.push(email)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }

    if (updates.length === 0) {
      return res.json({
        success: false,
        message: '没有可更新的字段'
      })
    }

    updates.push('updated_at = NOW()')
    params.push(id)

    const sql = `UPDATE sys_users SET ${updates.join(', ')} WHERE id = ?`
    await db.query(sql, params)

    res.json({
      success: true,
      message: '用户信息更新成功'
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    res.json({
      success: false,
      message: '更新用户失败: ' + error.message
    })
  }
}

/**
 * 删除用户
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // 检查用户是否存在
    const [users] = await db.query('SELECT username FROM sys_users WHERE id = ?', [id])
    if (users.length === 0) {
      return res.json({
        success: false,
        message: '用户不存在'
      })
    }

    // 防止删除admin账号
    if (users[0].username === 'admin') {
      return res.json({
        success: false,
        message: '不能删除管理员账号'
      })
    }

    await db.query('DELETE FROM sys_users WHERE id = ?', [id])

    res.json({
      success: true,
      message: '用户删除成功'
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    res.json({
      success: false,
      message: '删除用户失败: ' + error.message
    })
  }
}

/**
 * 重置用户密码
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.json({
        success: false,
        message: '密码至少6位'
      })
    }

    // 检查用户是否存在
    const [users] = await db.query('SELECT id FROM sys_users WHERE id = ?', [id])
    if (users.length === 0) {
      return res.json({
        success: false,
        message: '用户不存在'
      })
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)

    // 更新密码
    await db.query('UPDATE sys_users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, id])

    res.json({
      success: true,
      message: '密码重置成功'
    })
  } catch (error) {
    console.error('重置密码失败:', error)
    res.json({
      success: false,
      message: '重置密码失败: ' + error.message
    })
  }
}

/**
 * 修改用户状态
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (status !== 0 && status !== 1) {
      return res.json({
        success: false,
        message: '状态值无效'
      })
    }

    // 检查用户是否存在
    const [users] = await db.query('SELECT id FROM sys_users WHERE id = ?', [id])
    if (users.length === 0) {
      return res.json({
        success: false,
        message: '用户不存在'
      })
    }

    await db.query('UPDATE sys_users SET status = ?, updated_at = NOW() WHERE id = ?', [status, id])

    res.json({
      success: true,
      message: '用户状态更新成功'
    })
  } catch (error) {
    console.error('更新用户状态失败:', error)
    res.json({
      success: false,
      message: '更新用户状态失败: ' + error.message
    })
  }
}

/**
 * 删除单条日志
 */
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params

    // 检查日志是否存在
    const [logs] = await db.query('SELECT id FROM sys_logs WHERE id = ?', [id])
    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: '日志不存在'
      })
    }

    // 删除日志
    await db.query('DELETE FROM sys_logs WHERE id = ?', [id])

    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query('INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)', [userId, username, 'DELETE_LOG', req.ip, `删除日志ID: ${id}`])

    res.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除日志失败:', error)
    res.status(500).json({
      success: false,
      message: '删除失败: ' + error.message
    })
  }
}

/**
 * 批量删除日志
 */
exports.batchDeleteLogs = async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的日志ID列表'
      })
    }

    // 批量删除
    const placeholders = ids.map(() => '?').join(',')
    const sql = `DELETE FROM sys_logs WHERE id IN (${placeholders})`
    const [result] = await db.query(sql, ids)

    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query('INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)', [userId, username, 'BATCH_DELETE_LOG', req.ip, `批量删除 ${result.affectedRows} 条日志`])

    res.json({
      success: true,
      message: `成功删除 ${result.affectedRows} 条日志`,
      data: { deletedCount: result.affectedRows }
    })
  } catch (error) {
    console.error('批量删除日志失败:', error)
    res.status(500).json({
      success: false,
      message: '批量删除失败: ' + error.message
    })
  }
}
