// 主跨列表
exports.getList = async (req, res) => {
  const { bridgeId } = req.query
  try {
    const [rows] = await db.query('SELECT * FROM sections WHERE bridge_id=?', [bridgeId])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.json({ success: false, msg: '查询失败' })
  }
}
// 传感器列表
exports.getList = async (req, res) => {
  const { sectionId } = req.query
  try {
    const [rows] = await db.query('SELECT * FROM sensors WHERE section_id=?', [sectionId])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.json({ success: false, msg: '查询失败' })
  }
}
