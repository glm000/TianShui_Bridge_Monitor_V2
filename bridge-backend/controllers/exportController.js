// 数据导出控制器
const db = require('../config/db')
const ExcelJS = require('exceljs')

/**
 * 导出告警数据
 */
exports.exportAlarms = async (req, res) => {
  try {
    const {
      status,
      bridgeId,
      sectionId,
      startDate,
      endDate,
      keyword
    } = req.query

    // 构建查询条件（与告警列表查询逻辑一致）
    let whereClause = '1=1'
    const params = []

    if (status && status !== 'all') {
      whereClause += ' AND a.is_handled = ?'
      params.push(parseInt(status))
    }

    if (bridgeId) {
      whereClause += ' AND b.id = ?'
      params.push(parseInt(bridgeId))
    }

    if (sectionId) {
      whereClause += ' AND sec.id = ?'
      params.push(parseInt(sectionId))
    }

    if (startDate) {
      whereClause += ' AND a.created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      whereClause += ' AND a.created_at <= ?'
      params.push(endDate)
    }

    if (keyword) {
      whereClause += ' AND (b.name LIKE ? OR s.sensor_name LIKE ? OR a.msg LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // 查询数据
    const sql = `
      SELECT 
        a.id,
        b.name as bridge_name,
        sec.name as section_name,
        s.sensor_code,
        s.sensor_name,
        s.sensor_type,
        a.val,
        s.unit,
        a.msg,
        CASE a.is_handled 
          WHEN 0 THEN '未处理'
          WHEN 1 THEN '处理中'
          WHEN 2 THEN '已解决'
          ELSE '未知'
        END as status,
        a.handled_by,
        DATE_FORMAT(a.handled_at, '%Y-%m-%d %H:%i:%s') as handled_at,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM alarms a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 10000
    `
    const [rows] = await db.query(sql, params)

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('告警数据')

    // 设置列
    worksheet.columns = [
      { header: '告警ID', key: 'id', width: 10 },
      { header: '桥梁名称', key: 'bridge_name', width: 20 },
      { header: '主跨名称', key: 'section_name', width: 20 },
      { header: '传感器编码', key: 'sensor_code', width: 18 },
      { header: '传感器名称', key: 'sensor_name', width: 18 },
      { header: '传感器类型', key: 'sensor_type', width: 12 },
      { header: '告警值', key: 'val', width: 12 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '告警消息', key: 'msg', width: 40 },
      { header: '状态', key: 'status', width: 12 },
      { header: '处理人', key: 'handled_by', width: 12 },
      { header: '处理时间', key: 'handled_at', width: 20 },
      { header: '告警时间', key: 'created_at', width: 20 }
    ]

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    // 添加数据
    rows.forEach(row => {
      worksheet.addRow(row)
    })

    // 设置数据行样式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' }
      }
    })

    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [userId, username, 'EXPORT_DATA', req.ip, `导出告警数据，共 ${rows.length} 条记录`]
    )

    // 设置响应头
    const filename = `告警数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`)

    // 写入响应
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('导出告警数据失败:', error)
    res.status(500).json({
      success: false,
      message: '导出失败: ' + error.message
    })
  }
}

/**
 * 导出传感器数据
 */
exports.exportSensorData = async (req, res) => {
  try {
    const {
      sensorCode,
      startDate,
      endDate,
      bridgeId,
      sectionId
    } = req.query

    // 验证必填参数
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请选择时间范围'
      })
    }

    // 构建查询条件
    let whereClause = '1=1'
    const params = []

    if (sensorCode) {
      whereClause += ' AND sd.sensor_code = ?'
      params.push(sensorCode)
    }

    if (bridgeId) {
      whereClause += ' AND b.id = ?'
      params.push(parseInt(bridgeId))
    }

    if (sectionId) {
      whereClause += ' AND sec.id = ?'
      params.push(parseInt(sectionId))
    }

    whereClause += ' AND sd.created_at >= ? AND sd.created_at <= ?'
    params.push(startDate, endDate)

    // 查询数据（限制最多导出10万条）
    const sql = `
      SELECT 
        sd.id,
        b.name as bridge_name,
        sec.name as section_name,
        s.sensor_code,
        s.sensor_name,
        s.sensor_type,
        sd.value,
        s.unit,
        s.limit_max,
        s.limit_min,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM sensor_data sd
      LEFT JOIN sensors s ON sd.sensor_id = s.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN bridges b ON sec.bridge_id = b.id
      WHERE ${whereClause}
      ORDER BY sd.created_at DESC
      LIMIT 100000
    `
    const [rows] = await db.query(sql, params)

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到符合条件的数据'
      })
    }

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('传感器数据')

    // 设置列
    worksheet.columns = [
      { header: '数据ID', key: 'id', width: 12 },
      { header: '桥梁名称', key: 'bridge_name', width: 20 },
      { header: '主跨名称', key: 'section_name', width: 20 },
      { header: '传感器编码', key: 'sensor_code', width: 18 },
      { header: '传感器名称', key: 'sensor_name', width: 18 },
      { header: '传感器类型', key: 'sensor_type', width: 12 },
      { header: '监测值', key: 'value', width: 15 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '上限阈值', key: 'limit_max', width: 12 },
      { header: '下限阈值', key: 'limit_min', width: 12 },
      { header: '采集时间', key: 'created_at', width: 20 }
    ]

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    // 添加数据
    rows.forEach(row => {
      worksheet.addRow(row)
    })

    // 设置数据行样式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' }
      }
    })

    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [userId, username, 'EXPORT_DATA', req.ip, `导出传感器数据，共 ${rows.length} 条记录`]
    )

    // 设置响应头
    const filename = `传感器数据_${startDate}_${endDate}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`)

    // 写入响应
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('导出传感器数据失败:', error)
    res.status(500).json({
      success: false,
      message: '导出失败: ' + error.message
    })
  }
}

/**
 * 导出操作日志
 */
exports.exportLogs = async (req, res) => {
  try {
    const {
      action,
      username,
      startDate,
      endDate,
      keyword
    } = req.query

    // 构建查询条件
    let whereClause = '1=1'
    const params = []

    if (action) {
      whereClause += ' AND action = ?'
      params.push(action)
    }

    if (username) {
      whereClause += ' AND username = ?'
      params.push(username)
    }

    if (startDate) {
      whereClause += ' AND created_at >= ?'
      params.push(startDate + ' 00:00:00')
    }
    if (endDate) {
      whereClause += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }

    if (keyword) {
      whereClause += ' AND (username LIKE ? OR details LIKE ? OR ip_addr LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // 查询数据
    const sql = `
      SELECT 
        id,
        username,
        action,
        ip_addr,
        details,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM sys_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50000
    `
    const [rows] = await db.query(sql, params)

    // 操作类型映射
    const actionLabels = {
      'LOGIN': '登录',
      'LOGOUT': '登出',
      'CREATE_USER': '创建用户',
      'UPDATE_USER': '修改用户',
      'DELETE_USER': '删除用户',
      'RESET_PASSWORD': '重置密码',
      'HANDLE_ALARM': '处理告警',
      'UPDATE_ALARM': '更新告警',
      'DELETE_ALARM': '删除告警',
      'BATCH_HANDLE_ALARM': '批量处理告警',
      'BATCH_DELETE_ALARM': '批量删除告警',
      'UPDATE_SENSOR': '修改传感器',
      'CREATE_SENSOR': '创建传感器',
      'DELETE_SENSOR': '删除传感器',
      'CREATE_BRIDGE': '创建桥梁',
      'UPDATE_BRIDGE': '修改桥梁',
      'DELETE_BRIDGE': '删除桥梁',
      'CREATE_SECTION': '创建主跨',
      'UPDATE_SECTION': '修改主跨',
      'DELETE_SECTION': '删除主跨',
      'EXPORT_DATA': '导出数据',
      'UPDATE_CONFIG': '修改配置',
      'SYSTEM_INIT': '系统初始化'
    }

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('操作日志')

    // 设置列
    worksheet.columns = [
      { header: '日志ID', key: 'id', width: 12 },
      { header: '操作人', key: 'username', width: 15 },
      { header: '操作类型', key: 'action_label', width: 20 },
      { header: 'IP地址', key: 'ip_addr', width: 18 },
      { header: '详情', key: 'details', width: 50 },
      { header: '操作时间', key: 'created_at', width: 20 }
    ]

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    // 添加数据（转换操作类型为中文）
    rows.forEach(row => {
      // IP 地址格式化
      let ipAddr = row.ip_addr || '-'
      if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
        ipAddr = '127.0.0.1'
      } else if (ipAddr.startsWith('::ffff:')) {
        ipAddr = ipAddr.replace('::ffff:', '')
      }

      // 详情格式化（转换状态数字为中文）
      let details = row.details || ''
      const statusMap = { '0': '未处理', '1': '处理中', '2': '已解决' }
      details = details.replace(/状态为(\d)/g, (match, num) => `状态为${statusMap[num] || num}`)
      details = details.replace(/(\d)→(\d)/g, (match, from, to) => `${statusMap[from] || from}→${statusMap[to] || to}`)

      worksheet.addRow({
        id: row.id,
        username: row.username || '-',
        action_label: actionLabels[row.action] || row.action,
        ip_addr: ipAddr,
        details: details,
        created_at: row.created_at
      })
    })

    // 设置数据行样式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' }
      }
    })

    // 记录操作日志
    const currentUsername = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [userId, currentUsername, 'EXPORT_DATA', req.ip, `导出操作日志，共 ${rows.length} 条记录`]
    )

    // 设置响应头
    const filename = `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`)

    // 写入响应
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('导出操作日志失败:', error)
    res.status(500).json({
      success: false,
      message: '导出失败: ' + error.message
    })
  }
}
