// config/db.js
const mysql = require('mysql2')

// 加载环境变量 (防止单独运行此文件时找不到env)
require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // 强制返回时间字符串，避免时区问题
  timezone: '+08:00' // 设置为中国时区 (UTC+8)
})

// 测试连接
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.code)
  } else {
    console.log('✅ 数据库连接成功')
    connection.release()
  }
})

module.exports = pool.promise()
