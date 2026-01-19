const db = require('../config/db')

// 导出数据行数限制
const EXPORT_LIMIT = process.env.EXPORT_LIMIT || 10000

/**
 * GET /api/analysis/history - 查询历史数据（分页）
 * 参数：bridgeId, sectionId, sensorCode, startTime, endTime, page, pageSize
 */
exports.getHistory = async (req, res) => {
  try {
    const { bridgeId, sectionId, sensorCode, startTime, endTime, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize

    let sql = `
      SELECT 
        sd.id,
        sd.sensor_code,
        sd.value,
        sd.created_at,
        s.sensor_name,
        s.sensor_type,
        s.unit,
        s.limit_max,
        s.limit_min,
        sec.name as section_name,
        b.name as bridge_name
      FROM sensor_data sd
      JOIN sensors s ON sd.sensor_id = s.id
      JOIN sections sec ON s.section_id = sec.id
      JOIN bridges b ON sec.bridge_id = b.id
      WHERE 1=1
    `
    const params = []

    if (bridgeId) {
      sql += ' AND b.id = ?'
      params.push(bridgeId)
    }
    if (sectionId) {
      sql += ' AND sec.id = ?'
      params.push(sectionId)
    }
    if (sensorCode) {
      sql += ' AND sd.sensor_code = ?'
      params.push(sensorCode)
    }
    if (startTime) {
      sql += ' AND sd.created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND sd.created_at <= ?'
      params.push(endTime)
    }

    // 获取总数
    // 使用 [\s\S]+ 来匹配包括换行符在内的所有字符
    const countSql = sql.replace(/SELECT [\s\S]+ FROM/, 'SELECT COUNT(*) as total FROM')
    const [[{ total }]] = await db.query(countSql, params)

    // 获取分页数据
    sql += ' ORDER BY sd.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), parseInt(offset))
    const [rows] = await db.query(sql, params)

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/statistics - 获取统计数据
 * 参数：sensorCode, startTime, endTime
 */
exports.getStatistics = async (req, res) => {
  try {
    const { sensorCode, startTime, endTime } = req.query

    if (!sensorCode) {
      return res.status(400).json({ success: false, msg: '缺少 sensorCode 参数' })
    }

    let sql = `
      SELECT 
        COUNT(*) as count,
        MAX(value) as max_value,
        MIN(value) as min_value,
        AVG(value) as avg_value,
        STDDEV(value) as std_dev
      FROM sensor_data
      WHERE sensor_code = ?
    `
    const params = [sensorCode]

    if (startTime) {
      sql += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND created_at <= ?'
      params.push(endTime)
    }

    const [rows] = await db.query(sql, params)
    const stats = rows[0]

    // 获取传感器限值信息
    const [sensorInfo] = await db.query('SELECT limit_max, limit_min, unit FROM sensors WHERE sensor_code = ?', [sensorCode])

    // 计算超限次数
    let exceedSql = `
      SELECT COUNT(*) as exceed_count
      FROM sensor_data sd
      JOIN sensors s ON sd.sensor_id = s.id
      WHERE sd.sensor_code = ?
    `
    const exceedParams = [sensorCode]

    if (sensorInfo[0]) {
      const { limit_max, limit_min } = sensorInfo[0]
      const conditions = []
      if (limit_max !== null) {
        conditions.push(`sd.value > ?`)
        exceedParams.push(limit_max)
      }
      if (limit_min !== null) {
        conditions.push(`sd.value < ?`)
        exceedParams.push(limit_min)
      }
      if (conditions.length > 0) {
        exceedSql += ` AND (${conditions.join(' OR ')})`
      }
    }

    if (startTime) {
      exceedSql += ' AND sd.created_at >= ?'
      exceedParams.push(startTime)
    }
    if (endTime) {
      exceedSql += ' AND sd.created_at <= ?'
      exceedParams.push(endTime)
    }

    const [[{ exceed_count }]] = await db.query(exceedSql, exceedParams)

    res.json({
      success: true,
      data: {
        count: parseInt(stats.count),
        maxValue: parseFloat(stats.max_value) || 0,
        minValue: parseFloat(stats.min_value) || 0,
        avgValue: parseFloat(stats.avg_value) || 0,
        stdDev: parseFloat(stats.std_dev) || 0,
        exceedCount: parseInt(exceed_count),
        unit: sensorInfo[0]?.unit || ''
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/trend - 获取趋势数据
 * 参数：sensorCode, startTime, endTime, granularity(minute/hour/day)
 */
exports.getTrend = async (req, res) => {
  try {
    const { sensorCode, startTime, endTime, granularity = 'hour' } = req.query

    if (!sensorCode) {
      return res.status(400).json({ success: false, msg: '缺少 sensorCode 参数' })
    }

    // 根据粒度确定分组格式
    let dateFormat
    switch (granularity) {
      case 'minute':
        dateFormat = '%Y-%m-%d %H:%i:00'
        break
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'hour':
      default:
        dateFormat = '%Y-%m-%d %H:00:00'
    }

    let sql = `
      SELECT 
        DATE_FORMAT(created_at, '${dateFormat}') as time_group,
        AVG(value) as avg_value,
        MAX(value) as max_value,
        MIN(value) as min_value,
        COUNT(*) as count
      FROM sensor_data
      WHERE sensor_code = ?
    `
    const params = [sensorCode]

    if (startTime) {
      sql += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND created_at <= ?'
      params.push(endTime)
    }

    sql += ' GROUP BY time_group ORDER BY time_group ASC'

    const [rows] = await db.query(sql, params)

    res.json({
      success: true,
      data: rows.map(row => ({
        time: row.time_group,
        avgValue: parseFloat(row.avg_value),
        maxValue: parseFloat(row.max_value),
        minValue: parseFloat(row.min_value),
        count: parseInt(row.count)
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/distribution - 获取数据分布（直方图）
 * 参数：sensorCode, startTime, endTime, bins(区间数，默认10)
 */
exports.getDistribution = async (req, res) => {
  try {
    const { sensorCode, startTime, endTime, bins = 10 } = req.query

    if (!sensorCode) {
      return res.status(400).json({ success: false, msg: '缺少 sensorCode 参数' })
    }

    // 先获取最大最小值
    let statsSql = `
      SELECT MIN(value) as min_val, MAX(value) as max_val
      FROM sensor_data
      WHERE sensor_code = ?
    `
    const statsParams = [sensorCode]

    if (startTime) {
      statsSql += ' AND created_at >= ?'
      statsParams.push(startTime)
    }
    if (endTime) {
      statsSql += ' AND created_at <= ?'
      statsParams.push(endTime)
    }

    const [[{ min_val, max_val }]] = await db.query(statsSql, statsParams)

    if (min_val === null || max_val === null) {
      return res.json({ success: true, data: [] })
    }

    const minVal = parseFloat(min_val)
    const maxVal = parseFloat(max_val)
    const range = maxVal - minVal
    const binWidth = range / bins

    // 构建分布查询
    let sql = `
      SELECT 
        FLOOR((value - ?) / ?) as bin_index,
        COUNT(*) as count
      FROM sensor_data
      WHERE sensor_code = ?
    `
    const params = [minVal, binWidth, sensorCode]

    if (startTime) {
      sql += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND created_at <= ?'
      params.push(endTime)
    }

    sql += ' GROUP BY bin_index ORDER BY bin_index'

    const [rows] = await db.query(sql, params)

    // 构建完整的分布数据
    const distribution = []
    for (let i = 0; i < bins; i++) {
      const rangeStart = minVal + i * binWidth
      const rangeEnd = i === bins - 1 ? maxVal : rangeStart + binWidth
      const found = rows.find(r => parseInt(r.bin_index) === i)

      distribution.push({
        range: `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`,
        rangeStart: parseFloat(rangeStart.toFixed(2)),
        rangeEnd: parseFloat(rangeEnd.toFixed(2)),
        count: found ? parseInt(found.count) : 0
      })
    }

    res.json({ success: true, data: distribution })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/compare - 多传感器对比数据
 * 参数：sensorCodes(逗号分隔), startTime, endTime, granularity
 */
exports.getCompare = async (req, res) => {
  try {
    const { sensorCodes, startTime, endTime, granularity = 'hour' } = req.query

    if (!sensorCodes) {
      return res.status(400).json({ success: false, msg: '缺少 sensorCodes 参数' })
    }

    const codes = sensorCodes
      .split(',')
      .map(c => c.trim())
      .filter(c => c)
    if (codes.length === 0) {
      return res.status(400).json({ success: false, msg: 'sensorCodes 格式错误' })
    }

    // 根据粒度确定分组格式
    let dateFormat
    switch (granularity) {
      case 'minute':
        dateFormat = '%Y-%m-%d %H:%i:00'
        break
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'hour':
      default:
        dateFormat = '%Y-%m-%d %H:00:00'
    }

    const result = {}

    // 为每个传感器查询趋势数据
    for (const code of codes) {
      let sql = `
        SELECT 
          DATE_FORMAT(created_at, '${dateFormat}') as time_group,
          AVG(value) as avg_value
        FROM sensor_data
        WHERE sensor_code = ?
      `
      const params = [code]

      if (startTime) {
        sql += ' AND created_at >= ?'
        params.push(startTime)
      }
      if (endTime) {
        sql += ' AND created_at <= ?'
        params.push(endTime)
      }

      sql += ' GROUP BY time_group ORDER BY time_group ASC'

      const [rows] = await db.query(sql, params)

      // 获取传感器名称
      const [[sensor]] = await db.query('SELECT sensor_name, unit FROM sensors WHERE sensor_code = ?', [code])

      result[code] = {
        sensorName: sensor?.sensor_name || code,
        unit: sensor?.unit || '',
        data: rows.map(row => ({
          time: row.time_group,
          value: parseFloat(row.avg_value)
        }))
      }
    }

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/alarms - 告警历史查询
 * 参数：bridgeId, sensorCode, startTime, endTime, isHandled, page, pageSize
 */
exports.getAlarms = async (req, res) => {
  try {
    const { bridgeId, sensorCode, startTime, endTime, isHandled, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize

    let sql = `
      SELECT 
        a.id,
        a.val,
        a.msg,
        a.is_handled,
        a.handled_by,
        a.handled_at,
        a.created_at,
        s.sensor_name,
        s.sensor_code,
        s.unit,
        sec.name as section_name,
        b.name as bridge_name,
        b.id as bridge_id
      FROM alarms a
      JOIN sensors s ON a.sensor_id = s.id
      JOIN sections sec ON s.section_id = sec.id
      JOIN bridges b ON sec.bridge_id = b.id
      WHERE 1=1
    `
    const params = []

    if (bridgeId) {
      sql += ' AND b.id = ?'
      params.push(bridgeId)
    }
    if (sensorCode) {
      sql += ' AND s.sensor_code = ?'
      params.push(sensorCode)
    }
    if (startTime) {
      sql += ' AND a.created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND a.created_at <= ?'
      params.push(endTime)
    }
    if (isHandled !== undefined && isHandled !== '') {
      sql += ' AND a.is_handled = ?'
      params.push(parseInt(isHandled))
    }

    // 获取总数
    const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM')
    const [[{ total }]] = await db.query(countSql, params)

    // 获取分页数据
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), parseInt(offset))
    const [rows] = await db.query(sql, params)

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/alarm-stats - 告警统计
 * 参数：startTime, endTime
 */
exports.getAlarmStats = async (req, res) => {
  try {
    const { startTime, endTime } = req.query

    let whereClause = 'WHERE 1=1'
    const params = []

    if (startTime) {
      whereClause += ' AND a.created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      whereClause += ' AND a.created_at <= ?'
      params.push(endTime)
    }

    // 总告警数
    const totalSql = `SELECT COUNT(*) as total FROM alarms a ${whereClause}`
    const [[{ total }]] = await db.query(totalSql, params)

    // 按类型分布（超上限/超下限）
    const typeSql = `
      SELECT 
        CASE 
          WHEN a.val > s.limit_max THEN 'exceed_max'
          WHEN a.val < s.limit_min THEN 'exceed_min'
          ELSE 'unknown'
        END as alarm_type,
        COUNT(*) as count
      FROM alarms a
      JOIN sensors s ON a.sensor_id = s.id
      ${whereClause}
      GROUP BY alarm_type
    `
    const [typeRows] = await db.query(typeSql, params)

    // 每日告警趋势
    const trendSql = `
      SELECT 
        DATE_FORMAT(a.created_at, '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM alarms a
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `
    const [trendRows] = await db.query(trendSql, params)

    res.json({
      success: true,
      data: {
        total: parseInt(total),
        typeDistribution: typeRows.map(row => ({
          type: row.alarm_type,
          count: parseInt(row.count)
        })),
        dailyTrend: trendRows.map(row => ({
          date: row.date,
          count: parseInt(row.count)
        }))
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}

/**
 * GET /api/analysis/export - 导出数据（CSV格式）
 * 参数：同历史数据查询参数
 */
exports.exportData = async (req, res) => {
  try {
    const { bridgeId, sectionId, sensorCode, startTime, endTime } = req.query

    let sql = `
      SELECT 
        sd.created_at as '时间',
        b.name as '桥梁',
        sec.name as '主跨',
        s.sensor_name as '传感器',
        s.sensor_code as '传感器编号',
        sd.value as '数值',
        s.unit as '单位',
        s.limit_max as '上限',
        s.limit_min as '下限',
        CASE 
          WHEN sd.value > s.limit_max THEN '超上限'
          WHEN sd.value < s.limit_min THEN '超下限'
          ELSE '正常'
        END as '状态'
      FROM sensor_data sd
      JOIN sensors s ON sd.sensor_id = s.id
      JOIN sections sec ON s.section_id = sec.id
      JOIN bridges b ON sec.bridge_id = b.id
      WHERE 1=1
    `
    const params = []

    if (bridgeId) {
      sql += ' AND b.id = ?'
      params.push(bridgeId)
    }
    if (sectionId) {
      sql += ' AND sec.id = ?'
      params.push(sectionId)
    }
    if (sensorCode) {
      sql += ' AND sd.sensor_code = ?'
      params.push(sensorCode)
    }
    if (startTime) {
      sql += ' AND sd.created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      sql += ' AND sd.created_at <= ?'
      params.push(endTime)
    }

    sql += ` ORDER BY sd.created_at DESC LIMIT ${parseInt(EXPORT_LIMIT)}` // 限制导出数量

    const [rows] = await db.query(sql, params)

    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: '没有数据可导出' })
    }

    // 构建CSV内容
    const headers = Object.keys(rows[0])
    let csv = headers.join(',') + '\n'

    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // 处理包含逗号或换行的字段
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      csv += values.join(',') + '\n'
    })

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="sensor_data_${Date.now()}.csv"`)
    res.send('\ufeff' + csv) // 添加BOM以支持Excel正确识别UTF-8
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message })
  }
}
