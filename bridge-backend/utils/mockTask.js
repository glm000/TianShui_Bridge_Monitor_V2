const db = require('../config/db')

// 模拟生成数据的任务
const startMockTask = () => {
  console.log('🛠️  数据模拟生成器已启动 (每10秒更新)...')

  setInterval(async () => {
    try {
      // 1. 获取所有传感器（包含阈值信息）
      const [sensors] = await db.query('SELECT id, sensor_code, sensor_type, sensor_name, limit_max, limit_min, unit FROM sensors')

      for (let sensor of sensors) {
        // 2. 根据传感器阈值范围智能生成数据
        let val = 0
        const limitMax = parseFloat(sensor.limit_max)
        const limitMin = parseFloat(sensor.limit_min)

        // 如果有上下限，基于阈值范围生成数据
        if (limitMax !== null && limitMin !== null && !isNaN(limitMax) && !isNaN(limitMin)) {
          const range = limitMax - limitMin
          const center = (limitMax + limitMin) / 2

          // 90%的数据在正常范围内（中心点±30%范围波动）
          // 10%的数据可能接近或超过阈值（用于测试告警）
          const rand = Math.random()

          if (rand < 0.9) {
            // 正常数据：在中心点±30%范围内波动
            const fluctuation = range * 0.3
            val = center + (Math.random() - 0.5) * fluctuation
          } else {
            // 异常数据：有5%概率超上限，5%概率超下限
            if (rand < 0.95) {
              // 接近或略超上限（上限的95%-110%）
              val = limitMax * (0.95 + Math.random() * 0.15)
            } else {
              // 接近或略超下限（下限的90%-105%）
              val = limitMin * (0.9 + Math.random() * 0.15)
            }
          }
        } else if (limitMax !== null && !isNaN(limitMax)) {
          // 只有上限：在0到上限之间生成数据
          const rand = Math.random()
          if (rand < 0.9) {
            // 90%数据在安全范围（0到上限80%）
            val = Math.random() * limitMax * 0.8
          } else {
            // 10%数据接近或超上限
            val = limitMax * (0.9 + Math.random() * 0.2)
          }
        } else if (limitMin !== null && !isNaN(limitMin)) {
          // 只有下限：在下限附近生成数据
          const rand = Math.random()
          if (rand < 0.95) {
            // 95%数据在安全范围（下限到下限200%）
            val = limitMin + Math.abs(limitMin) * Math.random()
          } else {
            // 5%数据接近或超下限
            val = limitMin * (0.8 + Math.random() * 0.3)
          }
        } else {
          // 没有阈值定义，使用默认值（小幅度波动）
          val = (Math.random() - 0.5) * 10
        }

        // 3. 插入传感器数据
        await db.query('INSERT INTO sensor_data (sensor_id, sensor_code, value) VALUES (?, ?, ?)', [sensor.id, sensor.sensor_code, val])

        // 4. 检测是否超限，自动生成告警
        let isExceeded = false
        let alarmMsg = ''

        if (sensor.limit_max !== null && val > parseFloat(sensor.limit_max)) {
          isExceeded = true
          alarmMsg = `${sensor.sensor_name} 超过上限 (上限:  ${sensor.limit_max}${sensor.unit || ''})`
        } else if (sensor.limit_min !== null && val < parseFloat(sensor.limit_min)) {
          isExceeded = true
          alarmMsg = `${sensor.sensor_name} 低于下限 (下限: ${sensor.limit_min}${sensor.unit || ''})`
        }

        // 5. 如果超限，写入告警表
        if (isExceeded) {
          await db.query('INSERT INTO alarms (sensor_id, val, msg, is_handled) VALUES (?, ?, ?, ?)', [sensor.id, val, alarmMsg, 0])
          console.log(`⚠️  告警:  ${sensor.sensor_code} - ${alarmMsg}, 当前值: ${val.toFixed(2)}`)
        }
      }
      // console.log(`[Mock] Generated data for ${sensors.length} sensors. `);
    } catch (err) {
      console.error('Mock Data Error:', err.message)
    }
  }, 30000) // 30秒一次
}

module.exports = startMockTask
