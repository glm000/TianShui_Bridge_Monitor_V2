const db = require('../config/db')

// 获取地图桥梁数据
exports.getMapBridges = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, location, lng, lat, image_url FROM bridges')
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取结构树
exports.getStructureTree = async (req, res) => {
  try {
    const [bridges] = await db.query('SELECT id, name FROM bridges')
    const [sections] = await db.query('SELECT id, bridge_id, name FROM sections')
    const [sensors] = await db.query('SELECT id, section_id, sensor_code, sensor_name, sensor_type FROM sensors')

    const tree = bridges.map(bridge => ({
      ...bridge,
      sections: sections
        .filter(s => s.bridge_id === bridge.id)
        .map(section => ({
          ...section,
          sensors: sensors.filter(sen => sen.section_id === section.id)
        }))
    }))

    res.json({ success: true, data: tree })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取桥梁可视化数据
exports.getBridgeVisual = async (req, res) => {
  try {
    const { id } = req.params
    const [bridges] = await db.query('SELECT * FROM bridges WHERE id = ?', [id])
    const [sections] = await db.query('SELECT * FROM sections WHERE bridge_id = ?', [id])

    if (bridges.length === 0) {
      return res.status(404).json({ success: false, msg: '桥梁不存在' })
    }

    res.json({ success: true, data: { bridge: bridges[0], sections } })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}

// 获取主跨可视化数据
exports.getSectionVisual = async (req, res) => {
  try {
    const { id } = req.params
    const [sections] = await db.query('SELECT * FROM sections WHERE id = ?', [id])
    const [sensors] = await db.query('SELECT * FROM sensors WHERE section_id = ?', [id])

    if (sections.length === 0) {
      return res.status(404).json({ success: false, msg: '主跨不存在' })
    }

    res.json({ success: true, data: { section: sections[0], sensors } })
  } catch (err) {
    res.status(500).json({ success: false, msg: '查询失败', error: err.message })
  }
}
