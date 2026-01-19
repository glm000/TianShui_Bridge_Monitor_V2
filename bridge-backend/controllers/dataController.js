const db = require('../config/db')

// 获取传感器历史数据 (折线图)
exports.getSensorHistory = async (req, res) => {
  try {
    const { code } = req.query // ?code=B1_MID_STR_01
    if (!code) return res.status(400).json({ msg: '缺少 sensor_code' })

    const [rows] = await db.query('SELECT value, created_at FROM sensor_data WHERE sensor_code = ? ORDER BY created_at DESC LIMIT 50', [code])
    // 翻转数组，让时间从左到右 (旧 -> 新)
    res.json({ success: true, data: rows.reverse() })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
}

// 获取最新报警列表
exports.getAlarms = async (req, res) => {
  try {
    const sql = `
            SELECT a.*, s.sensor_name, s.sensor_code, b.name as bridge_name , b.id as bridge_id
            FROM alarms a
            JOIN sensors s ON a.sensor_id = s.id
            JOIN sections sec ON s.section_id = sec.id
            JOIN bridges b ON sec.bridge_id = b.id
            ORDER BY a.created_at DESC LIMIT 20
        `
    const [rows] = await db.query(sql)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
}

/**
 * 删除单条传感器数据
 */
exports.deleteSensorData = async (req, res) => {
  try {
    const { id } = req.params
    
    // 检查数据是否存在
    const [data] = await db.query('SELECT id, sensor_code FROM sensor_data WHERE id = ?', [id])
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: '数据不存在'
      })
    }
    
    // 删除数据
    await db.query('DELETE FROM sensor_data WHERE id = ?', [id])
    
    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [userId, username, 'DELETE_SENSOR_DATA', req.ip, `删除传感器数据 ID: ${id}, 传感器: ${data[0].sensor_code}`]
    )
    
    res.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除传感器数据失败:', error)
    res.status(500).json({
      success: false,
      message: '删除失败: ' + error.message
    })
  }
}

/**
 * 批量删除传感器数据
 */
exports.batchDeleteSensorData = async (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的数据ID列表'
      })
    }
    
    // 批量删除
    const placeholders = ids.map(() => '?').join(',')
    const sql = `DELETE FROM sensor_data WHERE id IN (${placeholders})`
    const [result] = await db.query(sql, ids)
    
    // 记录操作日志
    const username = req.user?.username || 'unknown'
    const userId = req.user?.id || null
    await db.query(
      'INSERT INTO sys_logs (user_id, username, action, ip_addr, details) VALUES (?, ?, ?, ?, ?)',
      [userId, username, 'BATCH_DELETE_SENSOR_DATA', req.ip, `批量删除 ${result.affectedRows} 条传感器数据`]
    )
    
    res.json({
      success: true,
      message: `成功删除 ${result.affectedRows} 条数据`,
      data: { deletedCount: result.affectedRows }
    })
  } catch (error) {
    console.error('批量删除传感器数据失败:', error)
    res.status(500).json({
      success: false,
      message: '批量删除失败: ' + error.message
    })
  }
}
