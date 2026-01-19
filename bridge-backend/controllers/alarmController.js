// 告警管理控制器
const db = require('../config/db')

/**
 * 获取告警列表（支持分页、筛选、排序）
 */
exports.getAlarmList = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status, // 0未处理/1处理中/2已解决/all全部
      bridgeId,
      sectionId,
      startDate,
      endDate,
      keyword // 搜索关键词（桥梁名/传感器名/消息）
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    // 构建查询条件
    let whereClause = '1=1'
    const params = []

    // 状态筛选
    if (status && status !== 'all') {
      whereClause += ' AND a.is_handled = ?'
      params.push(parseInt(status))
    }

    // 桥梁筛选
    if (bridgeId) {
      whereClause += ' AND b.id = ?'
      params.push(parseInt(bridgeId))
    }

    // 主跨筛选
    if (sectionId) {
      whereClause += ' AND sec.id = ?'
      params.push(parseInt(sectionId))
    }

    // 时间范围筛选
    if (startDate) {
      whereClause += ' AND a.created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      whereClause += ' AND a.created_at <= ?'
      params.push(endDate)
    }

    // 关键词搜索
    if (keyword) {
      whereClause += ' AND (b.name LIKE ? OR s.sensor_name LIKE ? OR a.msg LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
    `
    const [countResult] = await db.query(countSql, params)
    const total = countResult[0].total

    // 获取列表
    const listSql = `
      SELECT 
        a.id,
        a.sensor_id,
        a.val,
        a.msg,
        a.is_handled,
        a.handled_by,
        a.handled_at,
        a.created_at,
        s.sensor_code,
        s.sensor_name,
        s.sensor_type,
        s.unit,
        sec.id as section_id,
        sec.name as section_name,
        b.id as bridge_id,
        b.name as bridge_name
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
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
    console.error('获取告警列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取告警列表失败: ' + error.message
    })
  }
}

/**
 * 获取告警详情
 */
exports.getAlarmById = async (req, res) => {
  try {
    const { id } = req.params

    const sql = `
      SELECT 
        a.*,
        s.sensor_code,
        s.sensor_name,
        s.sensor_type,
        s.unit,
        s.limit_max,
        s.limit_min,
        sec.id as section_id,
        sec.name as section_name,
        b.id as bridge_id,
        b.name as bridge_name,
        b.location
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE a.id = ?
    `
    const [alarms] = await db.query(sql, [id])

    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      })
    }

    res.json({
      success: true,
      data: alarms[0]
    })
  } catch (error) {
    console.error('获取告警详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取告警详情失败: ' + error.message
    })
  }
}

/**
 * 更新告警状态
 */
exports.updateAlarmStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, remark } = req.body // status: 0/1/2

    // 验证状态值
    if (![0, 1, 2].includes(parseInt(status))) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      })
    }

    // 检查告警是否存在
    const [alarms] = await db.query('SELECT * FROM alarms WHERE id = ?', [id])
    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      })
    }

    const alarm = alarms[0]
    const newStatus = parseInt(status)

    // 更新告警状态
    const updateSql = `
      UPDATE alarms 
      SET is_handled = ?,
          handled_by = ?,
          handled_at = NOW()
      WHERE id = ?
    `
    await db.query(updateSql, [newStatus, 'admin', id])

    // 记录操作日志
    const statusMap = { 0: '未处理', 1: '处理中', 2: '已解决' }
    const details = `告警ID: ${id}, 状态: ${alarm.is_handled}→${newStatus} (${statusMap[newStatus]})`
    
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [1, 'admin', 'HANDLE_ALARM', req.ip, details + (remark ? `, 备注: ${remark}` : '')]
    )

    res.json({
      success: true,
      message: '告警状态更新成功'
    })
  } catch (error) {
    console.error('更新告警状态失败:', error)
    res.status(500).json({
      success: false,
      message: '更新告警状态失败: ' + error.message
    })
  }
}

/**
 * 批量更新告警状态
 */
exports.batchUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的告警ID列表'
      })
    }

    if (![0, 1, 2].includes(parseInt(status))) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      })
    }

    const placeholders = ids.map(() => '?').join(',')
    const sql = `
      UPDATE alarms 
      SET is_handled = ?, handled_by = ?, handled_at = NOW()
      WHERE id IN (${placeholders})
    `
    const [result] = await db.query(sql, [parseInt(status), 'admin', ...ids])

    // 记录操作日志
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [1, 'admin', 'BATCH_HANDLE_ALARM', req.ip, `批量更新${result.affectedRows}条告警状态为${status}`]
    )

    res.json({
      success: true,
      message: `成功更新${result.affectedRows}条告警`
    })
  } catch (error) {
    console.error('批量更新告警状态失败:', error)
    res.status(500).json({
      success: false,
      message: '批量更新失败: ' + error.message
    })
  }
}

/**
 * 删除告警
 */
exports.deleteAlarm = async (req, res) => {
  try {
    const { id } = req.params

    // 检查告警是否存在
    const [alarms] = await db.query('SELECT * FROM alarms WHERE id = ?', [id])
    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      })
    }

    await db.query('DELETE FROM alarms WHERE id = ?', [id])

    // 记录操作日志
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [1, 'admin', 'DELETE_ALARM', req.ip, `删除告警ID: ${id}`]
    )

    res.json({
      success: true,
      message: '告警删除成功'
    })
  } catch (error) {
    console.error('删除告警失败:', error)
    res.status(500).json({
      success: false,
      message: '删除告警失败: ' + error.message
    })
  }
}

/**
 * 批量删除告警
 */
exports.batchDeleteAlarms = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的告警ID列表'
      })
    }

    const placeholders = ids.map(() => '?').join(',')
    const [result] = await db.query(`DELETE FROM alarms WHERE id IN (${placeholders})`, ids)

    // 记录操作日志
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [1, 'admin', 'BATCH_DELETE_ALARM', req.ip, `批量删除${result.affectedRows}条告警`]
    )

    res.json({
      success: true,
      message: `成功删除${result.affectedRows}条告警`
    })
  } catch (error) {
    console.error('批量删除告警失败:', error)
    res.status(500).json({
      success: false,
      message: '批量删除失败: ' + error.message
    })
  }
}

/**
 * 获取告警统计
 */
exports.getAlarmStatistics = async (req, res) => {
  try {
    const { startDate, endDate, bridgeId } = req.query

    let whereClause = '1=1'
    const params = []

    if (startDate) {
      whereClause += ' AND a.created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      whereClause += ' AND a.created_at <= ?'
      params.push(endDate)
    }
    if (bridgeId) {
      whereClause += ' AND b.id = ?'
      params.push(parseInt(bridgeId))
    }

    // 统计各状态告警数量
    const statusSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN a.is_handled = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN a.is_handled = 1 THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN a.is_handled = 2 THEN 1 ELSE 0 END) as resolved
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
    `
    const [statusResult] = await db.query(statusSql, params)

    // 按桥梁统计
    const bridgeSql = `
      SELECT 
        b.id,
        b.name,
        COUNT(*) as count
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
      GROUP BY b.id, b.name
      ORDER BY count DESC
    `
    const [bridgeResult] = await db.query(bridgeSql, params)

    // 按传感器类型统计
    const typeSql = `
      SELECT 
        s.sensor_type,
        COUNT(*) as count
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
      GROUP BY s.sensor_type
      ORDER BY count DESC
    `
    const [typeResult] = await db.query(typeSql, params)

    res.json({
      success: true,
      data: {
        status: statusResult[0],
        byBridge: bridgeResult,
        byType: typeResult
      }
    })
  } catch (error) {
    console.error('获取告警统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取告警统计失败: ' + error.message
    })
  }
}
