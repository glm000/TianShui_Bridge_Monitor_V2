<template>
  <div class="alarm-page-container">
    <div class="stats-section">
      <div class="stat-card total">
        <div class="stat-icon-wrapper">
          <el-icon><Bell /></el-icon>
        </div>
        <div class="stat-info">
          <div class="label">告警总数</div>
          <div class="value-group">
            <span class="value">{{ statistics.total || 0 }}</span>
            <span class="unit">条</span>
          </div>
        </div>
        <div class="card-glow"></div>
      </div>

      <div class="stat-card pending">
        <div class="stat-icon-wrapper">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-info">
          <div class="label">待处理</div>
          <div class="value-group">
            <span class="value">{{ statistics.pending || 0 }}</span>
            <span class="unit">条</span>
          </div>
        </div>
      </div>

      <div class="stat-card processing">
        <div class="stat-icon-wrapper">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="label">处理中</div>
          <div class="value-group">
            <span class="value">{{ statistics.processing || 0 }}</span>
            <span class="unit">条</span>
          </div>
        </div>
      </div>

      <div class="stat-card resolved">
        <div class="stat-icon-wrapper">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="label">已解决</div>
          <div class="value-group">
            <span class="value">{{ statistics.resolved || 0 }}</span>
            <span class="unit">条</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-panel">
      <div class="toolbar-wrapper">
        <div class="filter-area">
          <el-radio-group v-model="filterForm.status" size="default" class="tech-radio-group" @change="handleQuery">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="0">未处理</el-radio-button>
            <el-radio-button label="1">处理中</el-radio-button>
            <el-radio-button label="2">已解决</el-radio-button>
          </el-radio-group>

          <div class="divider"></div>

          <el-select v-model="filterForm.bridgeId" placeholder="选择桥梁" clearable class="glass-input w-160" @change="handleQuery">
            <el-option v-for="bridge in bridges" :key="bridge.id" :label="bridge.name" :value="bridge.id" />
          </el-select>

          <el-input v-model="filterForm.keyword" placeholder="搜索监测点位/内容..." clearable class="glass-input w-220" @keyup.enter="handleQuery">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button type="primary" :icon="Refresh" circle plain @click="handleQuery" class="icon-btn-glass" title="刷新数据" />
        </div>

        <div class="action-area">
          <transition name="el-fade-in">
            <div v-if="selectedIds.length > 0" class="batch-actions">
              <span class="selected-hint">
                已选
                <span class="num">{{ selectedIds.length }}</span>
                项
              </span>
              <el-button-group>
                <el-button type="primary" size="default" plain @click="handleBatchCommand('process')">转处理</el-button>
                <el-button type="success" size="default" plain @click="handleBatchCommand('resolve')">标解决</el-button>
                <el-button type="danger" size="default" plain @click="handleBatchCommand('delete')">删除</el-button>
              </el-button-group>
            </div>
          </transition>
          <el-button type="success" :icon="Download" @click="handleExport" :loading="exporting">导出数据</el-button>
        </div>
      </div>

      <div class="table-container" v-loading="loading">
        <el-table :data="alarmList" @selection-change="handleSelectionChange" height="100%" style="width: 100%" class="tech-table">
          <template #empty>
            <div class="empty-state">
              <el-icon class="empty-icon"><Warning /></el-icon>
              <p class="empty-text">暂无告警数据</p>
              <p class="empty-hint">请调整筛选条件或稍后再试</p>
            </div>
          </template>

          <el-table-column type="selection" width="45" align="center" />

          <el-table-column label="状态" min-width="120" align="center">
            <template #default="{ row }">
              <div class="status-badge" :class="getStatusClass(row.is_handled)">
                {{ getStatusText(row.is_handled) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="bridge_name" label="桥梁" min-width="120" align="center" show-overflow-tooltip />

          <el-table-column prop="section_name" label="工程部位" min-width="120" align="center" />
          <el-table-column prop="sensor_name" label="监测点位" min-width="120" align="center" />

          <el-table-column label="告警内容" min-width="300" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="alarm-msg">{{ row.msg }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="val" label="数值" width="140" align="center" header-align="center">
            <template #default="{ row }">
              <div class="value-cell">
                <span class="value-font">{{ formatValue(row.val) }}</span>
                <span class="value-font">{{ row.unit || '' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="created_at" label="时间" width="180" align="center" sortable>
            <template #default="{ row }">
              <span class="time-text">{{ row.created_at }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" size="small" @click="handleViewDetail(row)">详情</el-button>
                <el-dropdown trigger="click" @command="cmd => handleRowCommand(cmd, row)">
                  <el-icon class="more-btn"><ArrowDown /></el-icon>
                  <template #dropdown>
                    <el-dropdown-menu class="dark-dropdown">
                      <el-dropdown-item command="process" :disabled="row.is_handled !== 0">开始处理</el-dropdown-item>
                      <el-dropdown-item command="resolve" :disabled="row.is_handled === 2">标记解决</el-dropdown-item>
                      <el-dropdown-item command="delete" divided style="color: #f56c6c">删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-bar">
        <div class="pagination-wrapper">
          <el-pagination :current-page="pagination.page" :page-size="pagination.pageSize" :page-sizes="[20, 50, 100]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" background class="tech-pagination" />
        </div>
      </div>
    </div>

    <el-dialog v-model="detailDialogVisible" title="告警全息视图" width="600px" class="glass-dialog" append-to-body align-center>
      <div v-if="currentAlarm" class="detail-container">
        <div class="detail-header">
          <div class="dh-left">
            <span class="id-tag">ID: {{ currentAlarm.id }}</span>
            <span class="time">{{ currentAlarm.created_at }}</span>
          </div>
          <div class="dh-right">
            <span class="status-badge" :class="getStatusClass(currentAlarm.is_handled)" style="transform: none">
              {{ getStatusText(currentAlarm.is_handled) }}
            </span>
          </div>
        </div>

        <div class="detail-content-box">
          <div class="detail-row highlight">
            <label>告警信息</label>
            <div class="val text-danger">{{ currentAlarm.msg }}</div>
          </div>
          <div class="detail-grid-row">
            <div class="detail-cell">
              <label>监测对象</label>
              <div class="val">{{ currentAlarm.bridge_name }}</div>
            </div>
            <div class="detail-cell">
              <label>工程部位</label>
              <div class="val">{{ currentAlarm.section_name || '-' }}</div>
            </div>
          </div>
          <div class="detail-grid-row">
            <div class="detail-cell">
              <label>当前数值</label>
              <div class="val value-font lg">
                {{ formatValue(currentAlarm.val) }}
                <span class="unit">{{ currentAlarm.unit }}</span>
              </div>
            </div>
            <div class="detail-cell">
              <label>阈值范围</label>
              <div class="val code-font">{{ formatValue(currentAlarm.limit_min) }} ~ {{ formatValue(currentAlarm.limit_max) }}</div>
            </div>
          </div>
        </div>

        <div class="detail-footer" v-if="currentAlarm.is_handled !== 2">
          <el-button v-if="currentAlarm.is_handled === 0" type="primary" @click="handleUpdateStatus(currentAlarm, 1)">开始处理</el-button>
          <el-button v-else-if="currentAlarm.is_handled === 1" type="success" @click="handleUpdateStatus(currentAlarm, 2)">完成处理</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Warning, Clock, CircleCheck, Search, Refresh, ArrowDown, Download } from '@element-plus/icons-vue'
// 假设 API 路径保持不变
import { getAlarmList, getAlarmById, updateAlarmStatus, batchUpdateStatus, deleteAlarm, batchDeleteAlarms, getAlarmStatistics } from '../api/alarm.js'
import { getBridgesWithSensors } from '../api/dashboard.js'
import { exportAlarms } from '../api/export.js'

const loading = ref(false)
const statsLoading = ref(false)
const exporting = ref(false)
const alarmList = ref([])
const bridges = ref([])
const selectedIds = ref([])
const currentAlarm = ref(null)
const detailDialogVisible = ref(false)

const statistics = reactive({ total: 0, pending: 0, processing: 0, resolved: 0 })
const filterForm = reactive({ status: 'all', bridgeId: null, keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

// 辅助函数
const getStatusText = s => ({ 0: '未处理', 1: '处理中', 2: '已解决' }[s] || '-')
const getStatusClass = s => ({ 0: 'badge-pending', 1: 'badge-processing', 2: 'badge-resolved' }[s])
const formatValue = v => (v ? Number(v).toFixed(2) : '-')

// 数据加载逻辑
const loadBridges = async () => {
  try {
    const res = await getBridgesWithSensors()
    if (res.data?.success) bridges.value = res.data.data
  } catch (e) {}
}
const loadStatistics = async () => {
  try {
    const res = await getAlarmStatistics({ bridgeId: filterForm.bridgeId })
    if (res.data?.success) Object.assign(statistics, res.data.data.status)
  } catch (e) {}
}
const loadAlarmList = async () => {
  loading.value = true
  try {
    const res = await getAlarmList({ ...filterForm, ...pagination })
    if (res.data?.success) {
      alarmList.value = res.data.data.list
      pagination.total = res.data.data.total
    }
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleQuery = () => {
  pagination.page = 1
  loadAlarmList()
  loadStatistics()
}
const handleSelectionChange = sel => {
  selectedIds.value = sel.map(i => i.id)
}
const handlePageChange = p => {
  pagination.page = p
  loadAlarmList()
}
const handleSizeChange = s => {
  pagination.pageSize = s
  loadAlarmList()
}
const handleViewDetail = async row => {
  const res = await getAlarmById(row.id)
  if (res.data?.success) {
    currentAlarm.value = res.data.data
    detailDialogVisible.value = true
  }
}
// 批量操作处理
const handleBatchCommand = async cmd => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要操作的告警记录')
    return
  }

  const actions = {
    process: { status: 1, text: '转为处理中' },
    resolve: { status: 2, text: '标记为已解决' },
    delete: { status: null, text: '删除' }
  }

  const action = actions[cmd]
  if (!action) return

  try {
    if (cmd === 'delete') {
      await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条告警记录吗？此操作不可恢复。`, '批量删除确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
      const res = await batchDeleteAlarms(selectedIds.value)
      if (res.data?.success) {
        ElMessage.success(`成功删除 ${selectedIds.value.length} 条记录`)
        selectedIds.value = []
        loadAlarmList()
        loadStatistics()
      }
    } else {
      const res = await batchUpdateStatus({ ids: selectedIds.value, status: action.status })
      if (res.data?.success) {
        ElMessage.success(`成功${action.text} ${selectedIds.value.length} 条记录`)
        selectedIds.value = []
        loadAlarmList()
        loadStatistics()
      }
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败：' + (err.message || '未知错误'))
    }
  }
}

// 单行操作处理
const handleRowCommand = async (cmd, row) => {
  const actions = {
    process: { status: 1, text: '开始处理' },
    resolve: { status: 2, text: '标记解决' },
    delete: { status: null, text: '删除' }
  }

  const action = actions[cmd]
  if (!action) return

  try {
    if (cmd === 'delete') {
      await ElMessageBox.confirm(`确认删除此条告警记录吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      const res = await deleteAlarm(row.id)
      if (res.data?.success) {
        ElMessage.success('删除成功')
        loadAlarmList()
        loadStatistics()
      }
    } else {
      const res = await updateAlarmStatus(row.id, { status: action.status })
      if (res.data?.success) {
        ElMessage.success(`${action.text}成功`)
        loadAlarmList()
        loadStatistics()
      }
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败：' + (err.message || '未知错误'))
    }
  }
}

// 详情弹窗中的状态更新
const handleUpdateStatus = async (row, status) => {
  try {
    const res = await updateAlarmStatus(row.id, { status })
    if (res.data?.success) {
      ElMessage.success('状态更新成功')
      detailDialogVisible.value = false
      loadAlarmList()
      loadStatistics()
    }
  } catch (err) {
    ElMessage.error('操作失败：' + (err.message || '未知错误'))
  }
}

// 导出功能
const handleExport = async () => {
  exporting.value = true
  try {
    const params = {
      status: filterForm.status !== 'all' ? filterForm.status : '',
      bridgeId: filterForm.bridgeId || '',
      keyword: filterForm.keyword || ''
    }

    const response = await exportAlarms(params)

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `告警数据_${new Date().toISOString().slice(0, 10)}.xlsx`
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

onMounted(() => {
  loadBridges()
  loadAlarmList()
  loadStatistics()
})
</script>

<style scoped>
/* 容器设置：高度100%，背景透明以显示 AppLayout 的渐变 */
.alarm-page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: transparent;
  padding: 0 2px;
  overflow: hidden;
  color: #fff;
}

/* === 顶部统计卡片 (更扁平紧凑) === */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex-shrink: 0;
}

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  /* 深色半透明背景 */
  background: rgba(13, 26, 51, 0.4);
  border: 1px solid rgba(64, 243, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  overflow: hidden;
  transition: all 0.3s;
}
.stat-card:hover {
  transform: translateY(-2px);
  background: rgba(13, 26, 51, 0.6);
  border-color: rgba(64, 243, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stat-icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 16px;
  background: rgba(255, 255, 255, 0.05);
}

.stat-info .label {
  font-size: 12px;
  color: rgba(160, 180, 206, 0.8);
  margin-bottom: 2px;
}
.stat-info .value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}
.stat-info .unit {
  font-size: 12px;
  color: rgba(160, 180, 206, 0.6);
  margin-left: 4px;
}

/* 卡片特定色 */
.total .stat-icon-wrapper {
  color: #40f3ff;
  background: rgba(64, 243, 255, 0.1);
}
.total .card-glow {
  position: absolute;
  right: 0;
  top: 0;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(64, 243, 255, 0.2) 0%, transparent 70%);
  pointer-events: none;
}
.pending .stat-icon-wrapper {
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
}
.pending .value {
  color: #fa8c16;
}
.processing .stat-icon-wrapper {
  color: #597ef7;
  background: rgba(89, 126, 247, 0.1);
}
.resolved .stat-icon-wrapper {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

/* === 主内容面板 (玻璃容器) === */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 统一面板风格 */
  background: rgba(13, 26, 51, 0.25);
  border: 1px solid rgba(64, 243, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  min-height: 0; /* 允许 flex 子项收缩 */
}

/* 工具栏 */
.toolbar-wrapper {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(64, 243, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  box-sizing: border-box;
}
.filter-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

/* === 新增以下样式 === */
.action-area {
  display: flex;
  align-items: center;
  gap: 12px; /* 按钮组之间的间距 */
}
/* =================== */

/* 覆盖 Element 组件样式以适应科技风 */
.w-160 {
  width: 160px;
}
.w-220 {
  width: 220px;
}

:deep(.glass-input .el-input__wrapper),
:deep(.glass-input .el-select__wrapper) {
  background: rgba(0, 0, 0, 0.2) !important;
  box-shadow: none !important;
  border: 1px solid rgba(64, 243, 255, 0.15) !important;
  color: #fff !important;
}

:deep(.glass-input .el-input__inner) {
  color: rgba(255, 255, 255, 0.95) !important;
}

:deep(.glass-input .el-select__placeholder) {
  color: rgba(160, 180, 206, 0.6) !important;
}

:deep(.glass-input .el-select__selected-item) {
  color: rgba(255, 255, 255, 0.95) !important;
}
:deep(.tech-radio-group .el-radio-button__inner) {
  background: transparent;
  border: 1px solid rgba(64, 243, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
}
:deep(.tech-radio-group .el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: rgba(64, 243, 255, 0.15);
  border-color: #40f3ff;
  color: #40f3ff;
  box-shadow: none;
}

/* 增加单元格左右内边距，让内容呼吸感更强，减少紧凑带来的视觉空白 */
:deep(.tech-table .el-table__cell) {
  padding: 12px 0; /* 增加行高 */
}

/* 针对告警内容列，可以略微增加左侧 padding，使其与前一列区分更明显 */
:deep(.tech-table .cell) {
  padding: 0 12px;
}

.icon-btn-glass {
  background: transparent;
  border: 1px solid rgba(64, 243, 255, 0.2);
  color: rgba(64, 243, 255, 0.8);
}
.icon-btn-glass:hover {
  background: rgba(64, 243, 255, 0.1);
  color: #fff;
  border-color: #40f3ff;
}

/* 批量操作区 */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 6px;
}

.selected-hint {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.selected-hint .num {
  color: #40f3ff;
  font-weight: 700;
  font-size: 18px;
  margin: 0 4px;
  text-shadow: 0 0 8px rgba(64, 243, 255, 0.4);
}

/* 批量操作按钮组优化 */
.batch-actions :deep(.el-button-group .el-button) {
  font-size: 15px;
  font-weight: 500;
  padding: 10px 20px;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}

.batch-actions :deep(.el-button-group .el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 243, 255, 0.3);
}

/* === 表格样式 (Tech Table) === */
.table-container {
  flex: 1;
  overflow: hidden;
}

.tech-table {
  background: transparent !important;
  --el-table-border-color: rgba(64, 243, 255, 0.08);
  --el-table-header-bg-color: rgba(64, 243, 255, 0.04);
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(64, 243, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-table th) {
  font-weight: 600;
  color: rgba(160, 180, 206, 1);
  border-bottom: 1px solid rgba(64, 243, 255, 0.15) !important;
}
:deep(.el-table td) {
  border-bottom: 1px solid rgba(64, 243, 255, 0.05) !important;
}
:deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  transform: scale(0.95);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.status-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.status-badge:hover::before {
  left: 100%;
}

.badge-pending {
  background: rgba(250, 140, 22, 0.2);
  color: #fa8c16;
  border: 1px solid rgba(250, 140, 22, 0.4);
  box-shadow: 0 0 8px rgba(250, 140, 22, 0.15);
}

.badge-processing {
  background: rgba(64, 243, 255, 0.2);
  color: #40f3ff;
  border: 1px solid rgba(64, 243, 255, 0.4);
  box-shadow: 0 0 8px rgba(64, 243, 255, 0.15);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(64, 243, 255, 0.15);
  }
  50% {
    box-shadow: 0 0 16px rgba(64, 243, 255, 0.3);
  }
}

.badge-resolved {
  background: rgba(82, 196, 26, 0.2);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.4);
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.15);
}

/* 字体微调 */
.text-white {
  color: rgba(255, 255, 255, 0.95);
}
.text-sub {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.alarm-msg {
  color: #ff7875;
  font-weight: 500;
}

.value-cell {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.value-font {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
  color: #40f3ff;
  font-size: 14px;
  text-shadow: 0 0 8px rgba(64, 243, 255, 0.3);
}

.code-font {
  font-family: monospace;
  color: rgba(160, 180, 206, 0.8);
  font-size: 14px;
}

.time-text {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  letter-spacing: 0.5px;
}

/* 表格内容字体统一 */
:deep(.tech-table .el-table__body td) {
  font-size: 14px;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.row-actions .el-button {
  font-size: 14px;
}

.more-btn {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: 0.2s;
  font-size: 16px;
}
.more-btn:hover {
  color: #40f3ff;
}

/* 表格空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 64px;
  color: rgba(64, 243, 255, 0.3);
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px 0;
  font-weight: 500;
}

.empty-hint {
  font-size: 13px;
  color: rgba(160, 180, 206, 0.6);
  margin: 0;
}

/* === 分页栏 === */
.pagination-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-top: 1px solid rgba(64, 243, 255, 0.08);
}

.pagination-wrapper {
  display: flex;
  align-items: center;
}

:deep(.tech-pagination button),
:deep(.tech-pagination li) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(64, 243, 255, 0.15) !important;
  transition: all 0.2s;
}

:deep(.tech-pagination button:hover:not(:disabled)),
:deep(.tech-pagination li:hover:not(.is-disabled)) {
  color: #40f3ff !important;
  border-color: rgba(64, 243, 255, 0.4) !important;
  background: rgba(64, 243, 255, 0.1) !important;
}

:deep(.tech-pagination li.is-active) {
  border-color: #40f3ff !important;
  color: #40f3ff !important;
  background: rgba(64, 243, 255, 0.2) !important;
  font-weight: 600;
  box-shadow: 0 0 12px rgba(64, 243, 255, 0.2);
}

/* === 全局弹窗样式覆盖 (放在 scoped 外面或使用 :global) === */
:global(.glass-dialog.el-dialog) {
  background: rgba(11, 22, 44, 0.85) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(64, 243, 255, 0.2) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5) !important;
}
:global(.glass-dialog .el-dialog__title) {
  color: #fff !important;
}
:global(.glass-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
}

/* 操作列下拉菜单深色样式 */
:global(.dark-dropdown.el-dropdown-menu) {
  background: rgba(13, 26, 51, 0.98) !important;
  border: 1px solid rgba(64, 243, 255, 0.25) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(20px);
  padding: 6px !important;
}

:global(.dark-dropdown .el-dropdown-menu__item) {
  color: rgba(255, 255, 255, 0.9) !important;
  background: transparent !important;
  border-radius: 4px;
  margin: 2px 0;
  transition: all 0.2s;
}

:global(.dark-dropdown .el-dropdown-menu__item:hover) {
  background: rgba(64, 243, 255, 0.15) !important;
  color: #40f3ff !important;
}

:global(.dark-dropdown .el-dropdown-menu__item:focus) {
  background: rgba(64, 243, 255, 0.15) !important;
  color: #40f3ff !important;
}

:global(.dark-dropdown .el-dropdown-menu__item.is-disabled) {
  color: rgba(255, 255, 255, 0.3) !important;
  background: transparent !important;
}

:global(.dark-dropdown .el-dropdown-menu__item--divided) {
  border-top: 1px solid rgba(64, 243, 255, 0.15) !important;
  margin-top: 6px;
}

/* 详情弹窗内部布局 */
.detail-container {
  color: #fff;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dh-left .id-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  margin-right: 12px;
  color: #40f3ff;
}
.dh-left .time {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.detail-content-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.detail-row.highlight {
  margin-bottom: 16px;
}
.detail-row label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}
.detail-row .val.text-danger {
  color: #ff7875;
  background: rgba(255, 77, 79, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 77, 79, 0.2);
}

.detail-grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 12px;
}
.detail-grid-row:last-child {
  margin-bottom: 0;
}
.detail-cell label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
.detail-cell .val {
  font-size: 15px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}
.detail-cell .val.lg {
  font-size: 18px;
  color: #40f3ff;
  border-bottom: none;
}

.detail-footer {
  margin-top: 24px;
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
:deep(.el-overlay) {
  backdrop-filter: blur(4px); /* 给背景加一点模糊 */
  background-color: rgba(0, 0, 0, 0.4); /* 稍微加深一点背景压暗 */
}
</style>
