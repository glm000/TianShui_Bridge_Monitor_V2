<template>
  <div class="analysis-page">
    <!-- 1. 顶部标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="title">历史数据分析</h2>
        <p class="sub-title">趋势监测与异常溯源</p>
      </div>
    </div>

    <!-- 2. 筛选条件区域 (更紧凑) -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <div class="form-left">
          <!-- 优化：使用级联选择器代替3个独立下拉框 -->
          <el-form-item label="监测点位">
            <el-cascader v-model="cascaderValue" :options="cascaderOptions" :props="{ checkStrictly: false, emitPath: false, value: 'value', label: 'label' }" placeholder="请选择 桥梁 / 主跨 / 传感器" filterable clearable style="width: 300px" @change="onCascaderChange" />
          </el-form-item>

          <el-form-item label="时间范围">
            <el-date-picker v-model="dateRange" type="datetimerange" :shortcuts="dateShortcuts" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD HH:mm:ss" :default-time="defaultTime" style="width: 340px" />
          </el-form-item>
        </div>

        <div class="form-right">
          <el-button type="primary" @click="handleQuery" :loading="loading">
            <el-icon class="el-icon--left"><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleExport" :disabled="!canExport">
            <el-icon class="el-icon--left"><Download /></el-icon>
            导出
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 3. 统计指标栏 (修复配色：白底深字 + 彩色图标) -->
    <div class="stats-row" v-if="filterForm.sensorCode && statistics.count > 0" v-loading="loading">
      <div class="stat-card blue">
        <div class="stat-icon">
          <el-icon><DataLine /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">数据总量</span>
          <div class="value-group">
            <span class="value">{{ statistics.count.toLocaleString() }}</span>
            <span class="unit">条</span>
          </div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">
          <el-icon><Top /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">最大值</span>
          <div class="value-group">
            <span class="value">{{ statistics.maxValue?.toFixed?.(2) ?? '—' }}</span>
            <span class="unit">{{ statistics.unit }}</span>
          </div>
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">
          <el-icon><Bottom /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">最小值</span>
          <div class="value-group">
            <span class="value">{{ statistics.minValue?.toFixed?.(2) ?? '—' }}</span>
            <span class="unit">{{ statistics.unit }}</span>
          </div>
        </div>
      </div>
      <div class="stat-card teal">
        <div class="stat-icon">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">平均值</span>
          <div class="value-group">
            <span class="value">{{ statistics.avgValue?.toFixed?.(2) ?? '—' }}</span>
            <span class="unit">{{ statistics.unit }}</span>
          </div>
        </div>
      </div>
      <!-- 只有超限时才会闪烁红色 -->
      <div class="stat-card red" :class="{ 'has-alarm': statistics.exceedCount > 0 }">
        <div class="stat-icon">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">超限次数</span>
          <div class="value-group">
            <span class="value">{{ statistics.exceedCount?.toLocaleString?.() ?? '—' }}</span>
            <span class="unit">次</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 主内容区：Grid 布局 (左大右小) -->
    <div class="main-content" v-if="filterForm.sensorCode">
      <!-- 4.1 左侧：图表区域 (占据 75% 宽度) -->
      <div class="chart-section panel-box">
        <div class="panel-header">
          <div class="header-left">
            <el-radio-group v-model="activeTab" size="small" @change="onTabChange">
              <el-radio-button label="trend">趋势分析</el-radio-button>
              <el-radio-button label="compare">对比分析</el-radio-button>
            </el-radio-group>
          </div>
          <div class="header-right">
            <div class="control-group">
              <span class="control-label">统计粒度:</span>
              <el-radio-group v-model="granularity" size="small" @change="updateChart">
                <el-radio-button value="minute">分钟</el-radio-button>
                <el-radio-button value="hour">小时</el-radio-button>
                <el-radio-button value="day">天</el-radio-button>
              </el-radio-group>
            </div>

            <el-divider direction="vertical" />

            <el-radio-group v-model="chartType" size="small" @change="updateChart">
              <el-radio-button label="line">
                <el-icon><Share /></el-icon>
              </el-radio-button>
              <el-radio-button label="bar">
                <el-icon><Histogram /></el-icon>
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div v-if="activeTab === 'compare'" class="compare-toolbar">
          <el-select v-model="compareSensors" multiple collapse-tags collapse-tags-tooltip placeholder="添加对比传感器 (最多5个)" size="small" style="width: 100%" :max-collapse-tags="4" @change="handleCompareChange">
            <el-option v-for="s in availableSensors" :key="s.sensor_code" :label="`${s.sensor_name}`" :value="s.sensor_code" :disabled="compareSensors.length >= 5 && !compareSensors.includes(s.sensor_code)" />
          </el-select>
        </div>

        <div class="chart-wrapper">
          <div ref="chartEl" class="echarts-container" v-loading="chartLoading"></div>
          <el-empty v-if="!chartLoading && chartEmpty" :image-size="100" description="暂无图表数据" />
        </div>
      </div>

      <!-- 4.2 右侧：表格区域 (占据 25% 宽度，只看核心数据) -->
      <div class="table-section panel-box">
        <div class="panel-header">
          <span class="panel-title">明细列表</span>
          <el-button 
            type="danger" 
            size="small" 
            :disabled="selectedDataIds.length === 0" 
            @click="handleBatchDelete"
          >
            批量删除 ({{ selectedDataIds.length }})
          </el-button>
        </div>

        <div class="table-wrapper" ref="tableBodyEl">
          <el-table
  :data="historyData"
  height="100%"
  style="width: 100%"
  v-loading="tableLoading"
  size="small"
  stripe
  @selection-change="handleSelectionChange"
>
  <el-table-column type="selection" width="40" align="center" header-align="center" />
  
  <el-table-column
    prop="created_at"
    label="时间"
    min-width="120"
    align="center"
    header-align="center"
    show-overflow-tooltip
  />

  <el-table-column prop="value" label="数值" width="90" align="center" header-align="center">
    <template #default="{ row }">
      <span :class="{ 'text-danger': isExceeded(row), 'font-mono': true }">
        {{ Number(row.value).toFixed(2) }}
      </span>
    </template>
  </el-table-column>

  <el-table-column label="状态" width="70" align="center" header-align="center">
    <template #default="{ row }">
      <div class="status-dot" :class="isExceeded(row) ? 'error' : 'success'"></div>
    </template>
  </el-table-column>
  
  <el-table-column label="操作" width="70" align="center" header-align="center" fixed="right">
    <template #default="{ row }">
      <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
    </template>
  </el-table-column>
</el-table>
        </div>

        <div class="pagination-footer">
          <el-pagination 
            v-if="pagination.total > 0" 
            :current-page="pagination.page" 
            :page-size="pagination.pageSize" 
            :page-sizes="[20, 50, 100]" 
            :total="pagination.total" 
            :pager-count="5"
            small 
            background 
            layout="total, sizes, prev, pager, next"
            @update:current-page="val => (pagination.page = val)" 
            @update:page-size="val => (pagination.pageSize = val)" 
            @size-change="handleTableQuery" 
            @current-change="handleTableQuery" 
          />
        </div>
      </div>
    </div>

    <!-- 初始空状态 -->
    <div v-else-if="!loading" class="empty-guide">
      <el-empty description="请在上方选择传感器与时间范围进行查询">
        <template #image>
          <el-icon :size="60" color="#dcdfe6"><DataAnalysis /></el-icon>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { Search, Download, DataLine, Top, Bottom, TrendCharts, Warning, Share, Histogram, DataAnalysis } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模拟导入 (保持你原有的 API 路径)
import { getHistoryData, getStatistics, getTrendData, getCompareData, exportData } from '../api/analysis.js'
import { getBridgesWithSensors } from '../api/dashboard.js'
import { del, post } from '../request.js'

// --- 状态数据 ---
const bridges = ref([])
const allSensorsMap = ref(new Map()) // 扁平化存储所有传感器信息

const filterForm = reactive({
  bridgeId: null,
  sectionId: null,
  sensorCode: null
})

// 级联选择器数据
const cascaderValue = ref(null)
const cascaderOptions = ref([])

const dateRange = ref([])
const defaultTime = [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]

const loading = ref(false)
const chartLoading = ref(false)
const tableLoading = ref(false)

const statistics = reactive({
  count: 0,
  maxValue: 0,
  minValue: 0,
  avgValue: 0,
  exceedCount: 0,
  unit: ''
})

const historyData = ref([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const selectedDataIds = ref([])

const activeTab = ref('trend')
const granularity = ref('minute')
const chartType = ref('line')
const compareSensors = ref([])

const chartEmpty = ref(false)
const chartEl = ref(null)
let chartInstance = null

// --- 配置项 ---
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return [start, end]
    }
  },
  {
    text: '近3天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 3)
      return [start, end]
    }
  },
  {
    text: '近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  }
]

const canExport = computed(() => Boolean(filterForm.sensorCode && dateRange.value?.length === 2 && historyData.value.length > 0))

// 仅用于对比选择的传感器列表
const availableSensors = computed(() => {
  return Array.from(allSensorsMap.value.values())
})

// --- 初始化与加载 ---
const loadBridgesData = async () => {
  try {
    const res = await getBridgesWithSensors()
    if (res.data.success) {
      bridges.value = res.data.data || []
      processCascaderOptions(bridges.value)
    }
  } catch (err) {
    ElMessage.error('加载桥梁数据失败')
  }
}

// 转换级联数据结构
const processCascaderOptions = data => {
  allSensorsMap.value.clear()
  cascaderOptions.value = data.map(bridge => ({
    value: bridge.id,
    label: bridge.name,
    children: (bridge.sections || []).map(section => ({
      value: section.id,
      label: section.name,
      children: (section.sensors || []).map(sensor => {
        allSensorsMap.value.set(sensor.sensor_code, { ...sensor, bridgeId: bridge.id, sectionId: section.id })
        return {
          value: sensor.sensor_code,
          label: sensor.sensor_name,
          leaf: true
        }
      })
    }))
  }))
}

// 级联选择变化
const onCascaderChange = val => {
  if (!val) {
    filterForm.sensorCode = null
    return
  }
  // 如果选中了传感器（叶子节点）
  if (allSensorsMap.value.has(val)) {
    const sensor = allSensorsMap.value.get(val)
    filterForm.bridgeId = sensor.bridgeId
    filterForm.sectionId = sensor.sectionId
    filterForm.sensorCode = sensor.sensor_code
  }
}

// --- 核心逻辑 ---
const setQuickDate = () => {
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000 * 24 * 7) // 默认7天
  dateRange.value = [formatDate(start), formatDate(end)]
}
const formatDate = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')

const handleQuery = async () => {
  if (!filterForm.sensorCode) return ElMessage.warning('请先在左侧选择传感器')
  if (!dateRange.value?.length) return ElMessage.warning('请选择时间范围')

  loading.value = true
  pagination.page = 1

  try {
    await Promise.all([loadStatistics(), loadHistoryData(), updateChartInternal()])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  const res = await getStatistics({ sensorCode: filterForm.sensorCode, startTime: dateRange.value[0], endTime: dateRange.value[1] })
  if (res.data.success) Object.assign(statistics, res.data.data)
}

const loadHistoryData = async () => {
  tableLoading.value = true
  try {
    const res = await getHistoryData({
      sensorCode: filterForm.sensorCode,
      startTime: dateRange.value[0],
      endTime: dateRange.value[1],
      page: pagination.page,
      pageSize: pagination.pageSize
    })

    if (res.data.success) {
      historyData.value = res.data.data || []

      // --- 修改开始：增强赋值健壮性 ---
      if (res.data.pagination && res.data.pagination.total) {
        // 情况A：后端返回了标准的 pagination 对象
        Object.assign(pagination, res.data.pagination)
      } else if (typeof res.data.total === 'number') {
        // 情况B：后端把 total 直接放在了 data 根节点
        pagination.total = res.data.total
      } else {
        // 情况C：完全没返回 total，用当前数组长度兜底，防止分页栏消失
        pagination.total = historyData.value.length
      }
      // --- 修改结束 ---
    }
  } finally {
    tableLoading.value = false
  }
}

const handleTableQuery = () => loadHistoryData()

// --- 图表逻辑 ---
const updateChart = () => updateChartInternal()
const onTabChange = () => {
  if (activeTab.value === 'compare' && compareSensors.value.length === 0 && filterForm.sensorCode) {
    compareSensors.value = [filterForm.sensorCode]
  }
  updateChartInternal()
}
const handleCompareChange = () => updateChartInternal()

const updateChartInternal = async () => {
  if (!filterForm.sensorCode) return
  chartLoading.value = true

  try {
    // 确保 DOM 存在
    await nextTick()
    
    // 初始化图表实例
    if (!chartInstance && chartEl.value) {
      chartInstance = echarts.init(chartEl.value)
      window.addEventListener('resize', () => chartInstance.resize())
    }

    chartInstance.clear()

    if (activeTab.value === 'trend') {
      const res = await getTrendData({
        sensorCode: filterForm.sensorCode,
        startTime: dateRange.value[0],
        endTime: dateRange.value[1],
        granularity: granularity.value
      })
      const data = res.data.data || []
      chartEmpty.value = data.length === 0
      renderTrendChart(data)
    } else {
      const sensorList = compareSensors.value.length ? compareSensors.value.join(',') : filterForm.sensorCode
      const res = await getCompareData({
        sensorCodes: sensorList,
        startTime: dateRange.value[0],
        endTime: dateRange.value[1],
        granularity: granularity.value
      })
      const data = res.data.data || {}
      chartEmpty.value = Object.keys(data).length === 0
      renderCompareChart(data)
    }
    
    // 关键修复：数据渲染后立即调用 resize，确保布局正确
    await nextTick()
    chartInstance?.resize()
  } finally {
    chartLoading.value = false
  }
}

const commonChartOptions = {
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  grid: { left: '4%', right: '3%', top: 50, bottom: 60, containLabel: true },
  toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, saveAsImage: {} } },
  dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 10 }]
}

const renderTrendChart = data => {
  const times = data.map(d => d.time)
  const values = data.map(d => d.avgValue)

  chartInstance.setOption({
    ...commonChartOptions,
    xAxis: { type: 'category', data: times, boundaryGap: false },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [
      {
        name: '数值',
        type: chartType.value === 'bar' ? 'bar' : 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#409EFF' },
        areaStyle:
          chartType.value === 'line'
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(64,158,255,0.4)' },
                  { offset: 1, color: 'rgba(64,158,255,0.01)' }
                ])
              }
            : undefined
      }
    ]
  })
}

const renderCompareChart = dataMap => {
  const timestamps = new Set()
  Object.values(dataMap).forEach(sensor => (sensor.data || []).forEach(d => timestamps.add(d.time)))
  const dates = Array.from(timestamps).sort()

  const series = Object.values(dataMap).map(sensor => {
    const map = new Map((sensor.data || []).map(i => [i.time, i.value]))
    return {
      name: sensor.sensorName,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: dates.map(d => map.get(d) || null)
    }
  })

  chartInstance.setOption({
    ...commonChartOptions,
    legend: { top: 0, type: 'scroll' },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { type: 'dashed' } } },
    series
  })
}

// --- 辅助功能 ---
const isExceeded = row => {
  const val = Number(row.value)
  if (row.limit_max != null && val > row.limit_max) return true
  if (row.limit_min != null && val < row.limit_min) return true
  return false
}

const handleExport = () => {
  const url = exportData({ ...filterForm, startTime: dateRange.value[0], endTime: dateRange.value[1] })
  window.open(url, '_blank')
}

// 删除单条数据
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条传感器数据吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await del(`/api/data/sensor-data/${row.id}`)
    if (res.data.success) {
      ElMessage.success('删除成功！')
      // 重新加载数据
      await Promise.all([loadStatistics(), loadHistoryData(), updateChartInternal()])
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedDataIds.value = selection.map(item => item.id)
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedDataIds.value.length} 条传感器数据吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await post('/api/data/sensor-data/batch-delete', { ids: selectedDataIds.value })
    if (res.data.success) {
      ElMessage.success(`成功删除 ${selectedDataIds.value.length} 条数据！`)
      selectedDataIds.value = []
      // 重新加载数据
      await Promise.all([loadStatistics(), loadHistoryData(), updateChartInternal()])
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 自动调整布局
const tableBodyEl = ref(null)

onMounted(async () => {
  await loadBridgesData()
  setQuickDate()
})

onUnmounted(() => {
  chartInstance?.dispose()
})
</script>

<style scoped>
:global(:root) {
  --ap-bg: #f5f7fb;
  --ap-card: #ffffff;
  --ap-text: #1f2f3d;
  --ap-subtext: #6b7280;
  --ap-border: #e9edf3;

  --ap-radius: 10px;
  --ap-gap: 12px;

  --ap-shadow: 0 6px 18px rgba(16, 24, 40, 0.06);
  --ap-shadow-sm: 0 2px 10px rgba(16, 24, 40, 0.05);
}

.analysis-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ap-gap);
  padding: 16px;
  box-sizing: border-box;
  background: var(--ap-bg);
}

/* 2) 顶部标题：更“页头”化 */
.page-header {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  border: 1px solid var(--ap-border);
  border-radius: var(--ap-radius);
  padding: 14px 16px;
  box-shadow: var(--ap-shadow-sm);
}
.page-header .title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ap-text);
  letter-spacing: 0.2px;
}
.page-header .sub-title {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ap-subtext);
}

/* 3) 筛选卡片：更紧凑 + 可 sticky（可选） */
.filter-card {
  border: 1px solid var(--ap-border);
  border-radius: var(--ap-radius);
  box-shadow: var(--ap-shadow-sm);
}
.filter-card.sticky {
  position: sticky;
  top: 12px;            /* 根据你外层布局微调 */
  z-index: 30;
}
.filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}
.filter-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap; /* 窄屏换行 */
}
.form-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap; /* 窄屏换行 */
}
.form-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.filter-form .el-form-item {
  margin: 0;
}

/* 4) 统计卡片：自适应列数（替代固定 5 列） */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--ap-gap);
}
.stat-card {
  background: var(--ap-card);
  border-radius: var(--ap-radius);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;

  box-shadow: var(--ap-shadow-sm);
  border: 1px solid var(--ap-border);
  border-left: 4px solid #ddd;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--ap-shadow);
}

.stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.stat-info .label {
  font-size: 12px;
  color: #7b8190;
  margin-bottom: 2px;
}
.stat-info .value-group {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.stat-info .value {
  font-size: 20px;
  font-weight: 800;
  color: #111827;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
}
.stat-info .unit {
  font-size: 12px;
  color: #9aa1ac;
}

/* 颜色风格：保留你原来的逻辑 */
.stat-card.blue { border-left-color: #409eff; }
.stat-card.blue .stat-icon { background: #ecf5ff; color: #409eff; }

.stat-card.green { border-left-color: #67c23a; }
.stat-card.green .stat-icon { background: #f0f9eb; color: #67c23a; }

.stat-card.orange { border-left-color: #e6a23c; }
.stat-card.orange .stat-icon { background: #fdf6ec; color: #e6a23c; }

.stat-card.teal { border-left-color: #20b2aa; }
.stat-card.teal .stat-icon { background: rgba(32, 178, 170, 0.10); color: #20b2aa; }

.stat-card.red { border-left-color: #909399; }
.stat-card.red .stat-icon { background: #f4f4f5; color: #909399; }

.stat-card.has-alarm {
  border-left-color: #f56c6c;
  box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.22);
  animation: shadowPulse 2s infinite;
}
.stat-card.has-alarm .stat-icon { background: #fef0f0; color: #f56c6c; }
.stat-card.has-alarm .value { color: #f56c6c; }

@keyframes shadowPulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.24); }
  70% { box-shadow: 0 0 0 8px rgba(245, 108, 108, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0); }
}

/* 5) 主内容：更稳的 Grid（右侧给最小宽度），并加响应式 */
.main-content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 1fr);
  gap: var(--ap-gap);
}

/* 卡片统一风格 */
.panel-box {
  background: var(--ap-card);
  border-radius: var(--ap-radius);
  box-shadow: var(--ap-shadow-sm);
  border: 1px solid var(--ap-border);

  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-header {
  height: 44px;
  flex: 0 0 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ap-border);
  background: #fbfcff;

  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-weight: 700;
  font-size: 13px;
  color: #111827;
}

/* 图表区域 */
.chart-section .header-left,
.chart-section .header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.chart-section .control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chart-section .control-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}
.chart-section .compare-toolbar {
  padding: 10px 12px;
  border-bottom: 1px dashed #eef2f7;
  background: #ffffff;
}
.chart-section .chart-wrapper {
  flex: 1;
  min-height: 0;
  padding: 10px;
  position: relative;
}
.echarts-container {
  width: 100%;
  height: 100%;
}

/* 表格区域 */
.table-section .table-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* 分页栏：不要居中挤压，改为左右分布，并允许换行 */
.table-section .pagination-footer{
  padding: 10px 12px;          /* 给左侧 sizes 留空间 */
  justify-content: flex-start;  /* 不要居中 */
  overflow: visible;            /* 防止被裁剪 */
}
/* 让分页 sizes 更窄 */
.table-section .pagination-footer :deep(.el-pagination__sizes .el-select) {
  width: 85px !important;     /* 你想更窄就继续调小：80/72 */
  min-width: 0 !important;
}
/* 选择框本体也一起收窄 */
.table-section .pagination-footer :deep(.el-pagination__sizes .el-select__wrapper) {
  width: 85px !important;
}

/* 文案“条/页”占用也可略缩 */
.table-section .pagination-footer :deep(.el-pagination__sizes) {
  margin-right: 4px;
}


/* 状态与数值 */
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.status-dot.success { background: #67c23a; }
.status-dot.error { background: #f56c6c; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.text-danger { color: #f56c6c; font-weight: 700; }

/* 空状态 */
.empty-guide {
  flex: 1;
  background: var(--ap-card);
  border: 1px solid var(--ap-border);
  border-radius: var(--ap-radius);
  box-shadow: var(--ap-shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 6) 响应式：中屏减小右侧最小宽度；小屏改单列 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  }
}
@media (max-width: 960px) {
  .analysis-page {
    padding: 12px;
  }
  .main-content {
    grid-template-columns: 1fr;
  }
  .filter-card.sticky {
    top: 8px;
  }
}
</style>
