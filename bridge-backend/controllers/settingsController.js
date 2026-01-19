const db = require('../config/db')

// ===================== 桥梁管理 =====================

// 获取所有桥梁列表
exports.getAllBridges = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bridges ORDER BY id DESC')
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取单个桥梁详情
exports.getBridgeById = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query('SELECT * FROM bridges WHERE id = ?', [id])

    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: '桥梁不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 新增桥梁
exports.createBridge = async (req, res) => {
  try {
    const { name, location, lng, lat, image_url } = req.body

    if (!name) {
      return res.status(400).json({ success: false, msg: '桥梁名称不能为空' })
    }

    const [result] = await db.query('INSERT INTO bridges (name, location, lng, lat, image_url) VALUES (?, ?, ?, ?, ?)', [name, location, lng, lat, image_url])

    res.json({ success: true, msg: '新增成功', data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, msg: '新增失败', error: err.message })
  }
}

// 修改桥梁
exports.updateBridge = async (req, res) => {
  try {
    const { id } = req.params
    const { name, location, lng, lat, image_url } = req.body

    if (!name) {
      return res.status(400).json({ success: false, msg: '桥梁名称不能为空' })
    }

    const [result] = await db.query('UPDATE bridges SET name = ?, location = ?, lng = ?, lat = ?, image_url = ? WHERE id = ?', [name, location, lng, lat, image_url, id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '桥梁不存在' })
    }

    res.json({ success: true, msg: '修改成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '修改失败', error: err.message })
  }
}

// 删除桥梁（级联删除主跨和传感器）
exports.deleteBridge = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query('DELETE FROM bridges WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '桥梁不存在' })
    }

    res.json({ success: true, msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '删除失败', error: err.message })
  }
}

// ===================== 主跨管理 =====================

// 获取指定桥梁下的主跨列表
exports.getSectionsByBridge = async (req, res) => {
  try {
    const { bridgeId } = req.query

    if (!bridgeId) {
      return res.status(400).json({ success: false, msg: '桥梁ID不能为空' })
    }

    const [rows] = await db.query('SELECT * FROM sections WHERE bridge_id = ? ORDER BY id', [bridgeId])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取单个主跨详情
exports.getSectionById = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query('SELECT * FROM sections WHERE id = ?', [id])

    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: '主跨不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 新增主跨
exports.createSection = async (req, res) => {
  try {
    const { bridge_id, name, description, lng, lat, pos_x, pos_y, image_url } = req.body

    if (!bridge_id || !name) {
      return res.status(400).json({ success: false, msg: '桥梁ID和主跨名称不能为空' })
    }

    const [result] = await db.query('INSERT INTO sections (bridge_id, name, description, lng, lat, pos_x, pos_y, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [bridge_id, name, description, lng, lat, pos_x, pos_y, image_url])

    res.json({ success: true, msg: '新增成功', data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, msg: '新增失败', error: err.message })
  }
}

// 修改主跨
exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params
    const { bridge_id, name, description, lng, lat, pos_x, pos_y, image_url } = req.body

    if (!name) {
      return res.status(400).json({ success: false, msg: '主跨名称不能为空' })
    }

    const [result] = await db.query('UPDATE sections SET bridge_id = ?, name = ?, description = ?, lng = ?, lat = ?, pos_x = ?, pos_y = ?, image_url = ? WHERE id = ?', [bridge_id, name, description, lng, lat, pos_x, pos_y, image_url, id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '主跨不存在' })
    }

    res.json({ success: true, msg: '修改成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '修改失败', error: err.message })
  }
}

// 删除主跨（级联删除传感器）
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query('DELETE FROM sections WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '主跨不存在' })
    }

    res.json({ success: true, msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '删除失败', error: err.message })
  }
}

// ===================== 传感器管理 =====================

// 获取指定主跨下的传感器列表
exports.getSensorsBySection = async (req, res) => {
  try {
    const { sectionId } = req.query

    if (!sectionId) {
      return res.status(400).json({ success: false, msg: '主跨ID不能为空' })
    }

    const [rows] = await db.query('SELECT * FROM sensors WHERE section_id = ? ORDER BY id', [sectionId])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取单个传感器详情
exports.getSensorById = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query('SELECT * FROM sensors WHERE id = ?', [id])

    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: '传感器不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 新增传感器
exports.createSensor = async (req, res) => {
  try {
    const { section_id, sensor_code, sensor_name, sensor_type, limit_max, limit_min, unit, pos_x, pos_y } = req.body

    if (!section_id || !sensor_code || !sensor_name || !sensor_type) {
      return res.status(400).json({ success: false, msg: '主跨ID、传感器编码、名称和类型不能为空' })
    }

    // 检查传感器编码是否已存在
    const [existing] = await db.query('SELECT id FROM sensors WHERE sensor_code = ?', [sensor_code])
    if (existing.length > 0) {
      return res.status(400).json({ success: false, msg: '传感器编码已存在' })
    }

    const [result] = await db.query('INSERT INTO sensors (section_id, sensor_code, sensor_name, sensor_type, limit_max, limit_min, unit, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [section_id, sensor_code, sensor_name, sensor_type, limit_max, limit_min, unit, pos_x, pos_y])

    res.json({ success: true, msg: '新增成功', data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, msg: '新增失败', error: err.message })
  }
}

// 修改传感器
exports.updateSensor = async (req, res) => {
  try {
    const { id } = req.params
    const { section_id, sensor_code, sensor_name, sensor_type, limit_max, limit_min, unit, pos_x, pos_y } = req.body

    if (!sensor_code || !sensor_name || !sensor_type) {
      return res.status(400).json({ success: false, msg: '传感器编码、名称和类型不能为空' })
    }

    // 检查传感器编码是否被其他传感器占用
    const [existing] = await db.query('SELECT id FROM sensors WHERE sensor_code = ? AND id != ?', [sensor_code, id])
    if (existing.length > 0) {
      return res.status(400).json({ success: false, msg: '传感器编码已存在' })
    }

    const [result] = await db.query('UPDATE sensors SET section_id = ?, sensor_code = ?, sensor_name = ?, sensor_type = ?, limit_max = ?, limit_min = ?, unit = ?, pos_x = ?, pos_y = ? WHERE id = ?', [section_id, sensor_code, sensor_name, sensor_type, limit_max, limit_min, unit, pos_x, pos_y, id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '传感器不存在' })
    }

    res.json({ success: true, msg: '修改成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '修改失败', error: err.message })
  }
}

// 删除传感器
exports.deleteSensor = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query('DELETE FROM sensors WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, msg: '传感器不存在' })
    }

    res.json({ success: true, msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, msg: '删除失败', error: err.message })
  }
}
