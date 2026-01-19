<template>
  <div class="logs-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#409eff"><Document /></el-icon>
          <div class="stat-info">
            <div class="stat-label">今日日志</div>
            <div class="stat-value">{{ statistics.todayCount }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#67c23a"><User /></el-icon>
          <div class="stat-info">
            <div class="stat-label">24小时登录</div>
            <div class="stat-value">{{ statistics.loginCount }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#e6a23c"><Operation /></el-icon>
          <div class="stat-info">
            <div class="stat-label">操作类型</div>
            <div class="stat-value">{{ actionTypes.length }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#909399"><UserFilled /></el-icon>
          <div class="stat-info">
            <div class="stat-label">活跃用户</div>
            <div class="stat-value">{{ statistics.activeUsers.length }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 筛选表单 -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索用户名/IP/详情" clearable style="width: 200px" />
        </el-form-item>

        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="action in actionTypes" :key="action" :label="getActionLabel(action)" :value="action" />
          </el-select>
        </el-form-item>

        <el-form-item label="操作人">
          <el-select v-model="filters.username" placeholder="全部" clearable filterable style="width: 150px">
            <el-option v-for="user in logUsers" :key="user" :label="user" :value="user" />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Download" @click="handleExport" :loading="exporting">导出</el-button>
          <el-button type="danger" :icon="Delete" @click="handleBatchDelete" :disabled="selectedIds.length === 0">删除</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card class="table-card">
      <el-table :data="logList" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" align="center" />
        
        <el-table-column type="index" label="#" width="55" align="center" />
        
        <el-table-column prop="username" label="操作人" width="100" align="center" />
        
        <el-table-column prop="action" label="操作类型" min-width="150" align="center">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="details" label="详情" min-width="200" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDetails(row.details) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="ip_addr" label="IP地址" min-width="130" align="center">
          <template #default="{ row }">
            {{ formatIpAddress(row.ip_addr) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="操作时间" width="165" align="center" />
        
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-if="pagination.total > 0"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="pagination.total"
          :pager-count="7"
          small
          background
          layout="total, sizes, prev, pager, next, jumper"
          @update:current-page="val => (pagination.page = val)"
          @update:page-size="val => (pagination.pageSize = val)"
          @size-change="handleQuery"
          @current-change="handleQuery"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, RefreshLeft, Document, User, Operation, UserFilled, Download, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLogList, getActionTypes, getLogUsers, getLogStatistics, deleteLog, batchDeleteLogs } from '../api/logs'
import { exportLogs } from '../api/export'

// 状态数据
const loading = ref(false)
const exporting = ref(false)
const logList = ref([])
const actionTypes = ref([])
const logUsers = ref([])
const dateRange = ref([])
const selectedIds = ref([])

const filters = reactive({
  keyword: '',
  action: '',
  username: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const statistics = reactive({
  todayCount: 0,
  loginCount: 0,
  activeUsers: [],
  actionStats: []
})

// 操作类型映射
const actionLabels = {
  // 登录相关
  'LOGIN': '登录',
  'LOGOUT': '登出',
  
  // 用户管理
  'CREATE_USER': '创建用户',
  'UPDATE_USER': '修改用户',
  'DELETE_USER': '删除用户',
  'RESET_PASSWORD': '重置密码',
  
  // 告警管理
  'HANDLE_ALARM': '处理告警',
  'UPDATE_ALARM': '更新告警',
  'DELETE_ALARM': '删除告警',
  'BATCH_HANDLE_ALARM': '批量处理告警',
  'BATCH_DELETE_ALARM': '批量删除告警',
  
  // 传感器管理
  'UPDATE_SENSOR': '修改传感器',
  'CREATE_SENSOR': '创建传感器',
  'DELETE_SENSOR': '删除传感器',
  
  // 桥梁管理
  'CREATE_BRIDGE': '创建桥梁',
  'UPDATE_BRIDGE': '修改桥梁',
  'DELETE_BRIDGE': '删除桥梁',
  
  // 主跨管理
  'CREATE_SECTION': '创建主跨',
  'UPDATE_SECTION': '修改主跨',
  'DELETE_SECTION': '删除主跨',
  
  // 数据导出
  'EXPORT_DATA': '导出数据',
  
  // 数据删除
  'DELETE_SENSOR_DATA': '删除传感器数据',
  'BATCH_DELETE_SENSOR_DATA': '批量删除传感器数据',
  'DELETE_LOG': '删除日志',
  'BATCH_DELETE_LOG': '批量删除日志',
  
  // 系统配置
  'UPDATE_CONFIG': '修改配置',
  'SYSTEM_INIT': '系统初始化'
}

// 获取操作类型标签
const getActionLabel = (action) => {
  return actionLabels[action] || action
}

// 获取操作类型标签颜色
const getActionTagType = (action) => {
  const typeMap = {
    'LOGIN': 'success',
    'LOGOUT': 'info',
    'CREATE_USER': 'primary',
    'UPDATE_USER': 'warning',
    'DELETE_USER': 'danger',
    'RESET_PASSWORD': 'warning',
    'UPDATE_SENSOR': 'warning',
    'CREATE_SENSOR': 'primary',
    'DELETE_SENSOR': 'danger',
    'HANDLE_ALARM': 'success',
    'UPDATE_ALARM': 'warning',
    'DELETE_ALARM': 'danger',
    'BATCH_HANDLE_ALARM': 'primary',
    'BATCH_DELETE_ALARM': 'danger',
    'DELETE_BRIDGE': 'danger',
    'DELETE_SECTION': 'danger',
    'EXPORT_DATA': 'success',
    'DELETE_SENSOR_DATA': 'danger',
    'BATCH_DELETE_SENSOR_DATA': 'danger',
    'DELETE_LOG': 'danger',
    'BATCH_DELETE_LOG': 'danger',
    'SYSTEM_INIT': 'info'
  }
  return typeMap[action] || 'info'
}

// 格式化详情文本，将状态数字转换为中文
const formatDetails = (details) => {
  if (!details) return ''
  
  // 告警状态映射
  const statusMap = {
    '0': '未处理',
    '1': '处理中',
    '2': '已解决'
  }
  
  // 替换 "状态为0" -> "状态为未处理"
  let formatted = details.replace(/状态为(\d)/g, (match, num) => {
    return `状态为${statusMap[num] || num}`
  })
  
  // 替换 "0→…1" -> "未处理→处理中"
  formatted = formatted.replace(/(\d)→(\d)/g, (match, from, to) => {
    return `${statusMap[from] || from}→${statusMap[to] || to}`
  })
  
  // 替换 "状态: 0" -> "状态: 未处理"
  formatted = formatted.replace(/状态[:|：]\s*(\d)/g, (match, num) => {
    const colon = match.includes(':') ? ':' : '：'
    return `状态${colon} ${statusMap[num] || num}`
  })
  
  // 替换 "已处理" 后面的数字
  formatted = formatted.replace(/（已处理[:|：]\s*(\d)）/g, (match, num) => {
    return `（已处理: ${statusMap[num] || num}）`
  })
  
  return formatted
}

// 格式化IP地址，将IPv6回环地址转换为友好格式
const formatIpAddress = (ip) => {
  if (!ip) return '-'
  
  // IPv6 回环地址 ::1 -> 127.0.0.1
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }
  
  // IPv6 地址以 ::ffff: 开头，提取 IPv4 部分
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '')
  }
  
  return ip
}

// 加载日志列表
const loadLogList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      action: filters.action,
      username: filters.username,
      startDate: dateRange.value?.[0] || '',
      endDate: dateRange.value?.[1] || ''
    }

    const res = await getLogList(params)
    if (res.data.success) {
      logList.value = res.data.data.list
      pagination.total = res.data.data.total
    }
  } catch (error) {
    console.error('加载日志列表失败:', error)
    ElMessage.error('加载日志列表失败')
  } finally {
    loading.value = false
  }
}

// 加载操作类型列表
const loadActionTypes = async () => {
  try {
    const res = await getActionTypes()
    if (res.data.success) {
      actionTypes.value = res.data.data
    }
  } catch (error) {
    console.error('加载操作类型失败:', error)
  }
}

// 加载用户列表
const loadLogUsers = async () => {
  try {
    const res = await getLogUsers()
    if (res.data.success) {
      logUsers.value = res.data.data
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const res = await getLogStatistics()
    if (res.data.success) {
      Object.assign(statistics, res.data.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 查询
const handleQuery = () => {
  pagination.page = 1
  loadLogList()
}

// 重置
const handleReset = () => {
  filters.keyword = ''
  filters.action = ''
  filters.username = ''
  dateRange.value = []
  pagination.page = 1
  loadLogList()
}

// 导出功能
const handleExport = async () => {
  exporting.value = true
  try {
    const params = {
      keyword: filters.keyword || '',
      action: filters.action || '',
      username: filters.username || '',
      startDate: dateRange.value?.[0] || '',
      endDate: dateRange.value?.[1] || ''
    }
    
    const response = await exportLogs(params)
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功！')
  } catch (err) {
    console.error('导出失败:', err)
    ElMessage.error('导出失败：' + (err.message || '未知错误'))
  } finally {
    exporting.value = false
  }
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

// 删除单条日志
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条日志吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await deleteLog(row.id)
    if (res.data.success) {
      ElMessage.success('删除成功！')
      loadLogList()
      loadStatistics()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 条日志吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await batchDeleteLogs(selectedIds.value)
    if (res.data.success) {
      ElMessage.success(`成功删除 ${selectedIds.value.length} 条日志！`)
      selectedIds.value = []
      loadLogList()
      loadStatistics()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([
    loadActionTypes(),
    loadLogUsers(),
    loadStatistics(),
    loadLogList()
  ])
})
</script>

<style scoped>
.logs-page {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  background: #f5f7fb;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  border-radius: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

/* 筛选卡片 */
.filter-card {
  border-radius: 8px;
}

.filter-card :deep(.el-card__body) {
  padding: 16px;
}

.filter-card :deep(.el-form) {
  margin-bottom: 0;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 0;
}

/* 表格卡片 */
.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  min-height: 0;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-height: 0;
}

.table-card :deep(.el-table) {
  flex: 1;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
