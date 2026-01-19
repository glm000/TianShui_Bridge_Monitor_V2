<script setup>
import { ref, computed, shallowRef, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getOverview, getBridgesWithSensors, getRealTimeData, getSensorLatest, getAlarms } from '../api/dashboard.js'

// ===================== 状态 =====================
const currentTime = ref('')
const lastRefreshTime = ref('')

const overview = ref({
  bridgeCount: 0,
  sensorCount: 0,
  onlineSensors: 0,
  onlineRate: '0',
  todayAlarms: 0,
  unhandledAlarms: 0
})

const bridgesData = ref([])
const selectedBridgeId = ref(null)

const realtimeData = ref([])
const alarmsList = ref([])

const selectedSectionId = ref(null)
const sensorFilter = ref('all') // all | alarm | offline
const selectedSensorCode = ref(null)

const chartEl = ref(null)
const chartInstance = shallowRef(null)

const refreshing = ref(false)

let timeTimer = null
let refreshTimer = null

// ===================== 计算属性（桥梁/主跨/传感器） =====================
const currentBridge = computed(() => {
  if (!selectedBridgeId.value) return null
  return bridgesData.value.find(b => b.id === selectedBridgeId.value) || null
})

const realtimeMap = computed(() => {
  const m = new Map()
  for (const it of realtimeData.value || []) {
    m.set(it.sensor_code, it)
  }
  return m
})

const isSensorExceeded = (sensorMeta, realtimeVal) => {
  if (realtimeVal === undefined || realtimeVal === null || realtimeVal === '--') return false
  const val = Number(realtimeVal)
  if (Number.isNaN(val)) return false

  const hasMax = sensorMeta?.limit_max !== undefined && sensorMeta?.limit_max !== null && sensorMeta?.limit_max !== ''
  const hasMin = sensorMeta?.limit_min !== undefined && sensorMeta?.limit_min !== null && sensorMeta?.limit_min !== ''

  if (hasMax && val > Number(sensorMeta.limit_max)) return true
  if (hasMin && val < Number(sensorMeta.limit_min)) return true
  return false
}

// 离线/预警（大屏态势更友好）
const OFFLINE_MS = 60 * 1000
const WARN_RATIO = 0.8

const isOffline = rt => {
  if (!rt) return true
  if (!rt.created_at) return false // 后端无时间戳则仅按“有无数据”判断
  return Date.now() - new Date(rt.created_at).getTime() > OFFLINE_MS
}

const isWarnNearLimit = (meta, realtimeVal) => {
  const val = Number(realtimeVal)
  if (!Number.isFinite(val)) return false

  const max = meta?.limit_max
  const min = meta?.limit_min
  const hasMax = max !== undefined && max !== null && max !== ''
  const hasMin = min !== undefined && min !== null && min !== ''

  // 接近上限：>= 80%上限 且 <= 上限
  if (hasMax) {
    const mx = Number(max)
    if (val >= mx * WARN_RATIO && val <= mx) return true
  }
  // 接近下限：<= (下限 + 20%缓冲) 且 >= 下限
  if (hasMin) {
    const mn = Number(min)
    const warnMin = mn * (2 - WARN_RATIO) // 简化写法：当 mn 为正时更直观；如需严格可改为 mn + (0.2 * |mn|)
    if (val <= warnMin && val >= mn) return true
  }
  return false
}

const viewSections = computed(() => {
  const b = currentBridge.value
  if (!b?.sections?.length) return []

  return b.sections.map(sec => ({
    ...sec,
    viewSensors: (sec.sensors || []).map(s => {
      const rt = realtimeMap.value.get(s.sensor_code)
      const val = rt?.value ?? null
      const offline = isOffline(rt)
      const exceeded = !offline && isSensorExceeded(s, val)
      const warn = !offline && !exceeded && isWarnNearLimit(s, val)

      return {
        ...s,
        rt,
        offline,
        exceeded,
        warn,
        displayValue: offline ? '--' : val ?? '--'
      }
    })
  }))
})

const sectionStats = computed(() => {
  return viewSections.value.map(sec => {
    let normalCount = 0
    let warnCount = 0
    let alarmCount = 0
    let offlineCount = 0

    for (const s of sec.viewSensors || []) {
      if (s.offline) offlineCount++
      else if (s.exceeded) alarmCount++
      else if (s.warn) warnCount++
      else normalCount++
    }

    return { id: sec.id, name: sec.name, normalCount, warnCount, alarmCount, offlineCount }
  })
})

const currentSection = computed(() => {
  const secs = viewSections.value || []
  if (!secs.length) return null
  return secs.find(s => s.id === selectedSectionId.value) || secs[0]
})

const filteredSectionSensors = computed(() => {
  const list = currentSection.value?.viewSensors || []
  if (sensorFilter.value === 'alarm') return list.filter(s => s.exceeded)
  if (sensorFilter.value === 'offline') return list.filter(s => s.offline)
  return list
})

const selectedSensorMeta = computed(() => {
  const code = selectedSensorCode.value
  if (!code) return null
  for (const sec of viewSections.value) {
    const s = sec.viewSensors?.find(x => x.sensor_code === code)
    if (s) return s
  }
  return null
})

// 告警联动用：sensor_id -> (bridgeId, sectionId, sensorCode)
const sensorIdIndex = computed(() => {
  const m = new Map()
  for (const b of bridgesData.value || []) {
    for (const sec of b.sections || []) {
      for (const s of sec.sensors || []) {
        // 假设后端返回的传感器主键为 s.id，且与告警 sensor_id 一致
        m.set(s.id, { bridgeId: b.id, sectionId: sec.id, sensorCode: s.sensor_code })
      }
    }
  }
  return m
})

// ===================== 展示工具 =====================
const getSensorTypeName = type => {
  const typeMap = {
    strain: '应变',
    disp: '位移',
    press: '压力',
    vib: '振动',
    rebar: '钢筋应力'
  }
  return typeMap[type] || type
}

const formatNum = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '--'
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// ===================== API =====================
const loadOverview = async () => {
  try {
    const res = await getOverview()
    if (res.data?.success) overview.value = res.data.data
  } catch (err) {
    console.error('加载概览数据失败:', err)
  }
}

const loadBridgesData = async () => {
  try {
    const res = await getBridgesWithSensors()
    if (res.data?.success) {
      bridgesData.value = res.data.data || []
      if (bridgesData.value.length > 0 && !selectedBridgeId.value) {
        selectedBridgeId.value = bridgesData.value[0].id
      }
    }
  } catch (err) {
    console.error('加载桥梁数据失败:', err)
  }
}

const loadRealtimeData = async () => {
  try {
    const res = await getRealTimeData()
    if (res.data?.success) realtimeData.value = res.data.data || []
  } catch (err) {
    console.error('加载实时数据失败:', err)
  }
}

const loadAlarms = async () => {
  try {
    const res = await getAlarms()
    if (res.data?.success) alarmsList.value = (res.data.data || []).slice(0, 10)
  } catch (err) {
    console.error('加载告警数据失败:', err)
  }
}

// ===================== ECharts =====================
const ensureChart = async () => {
  await nextTick()
  if (!chartEl.value) return

  if (chartInstance.value && chartInstance.value.getDom() !== chartEl.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
  if (!chartInstance.value) chartInstance.value = echarts.init(chartEl.value)
}

const buildThreshold = sensorMeta => {
  const max = sensorMeta?.limit_max
  const min = sensorMeta?.limit_min
  const hasMax = max !== undefined && max !== null && max !== ''
  const hasMin = min !== undefined && min !== null && min !== ''
  return {
    hasMax,
    hasMin,
    max: hasMax ? Number(max) : null,
    min: hasMin ? Number(min) : null
  }
}

const updateChart = async (times, values, sensorMeta) => {
  await ensureChart()
  if (!chartInstance.value) return

  const sensorCode = sensorMeta?.sensor_code || selectedSensorCode.value || ''
  const unit = sensorMeta?.unit ? `（${sensorMeta.unit}）` : ''
  const th = buildThreshold(sensorMeta)

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: `传感器 ${sensorCode} 实时数据${unit}`,
      left: 'center',
      top: 10,
      textStyle: { color: '#40f3ff', fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 20, 40, 0.88)',
      borderColor: '#40f3ff',
      textStyle: { color: '#fff' },
      formatter: params => {
        const p = params?.[0]
        if (!p) return ''
        return `${p.axisValue}<br/>数值：${formatNum(p.data)}`
      }
    },
    grid: { left: '8%', right: '5%', top: '20%', bottom: '12%' },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: '#40f3ff' } },
      axisLabel: { color: 'rgba(160, 180, 206, 0.95)' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#40f3ff' } },
      axisLabel: { color: 'rgba(160, 180, 206, 0.95)' },
      splitLine: { lineStyle: { color: 'rgba(64, 243, 255, 0.08)' } }
    },
    series: [
      {
        name: '数值',
        type: 'line',
        smooth: true,
        data: values,

        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,

        itemStyle: {
          color: params => {
            const v = Number(params.value)
            const ex = (th.hasMax && v > th.max) || (th.hasMin && v < th.min)
            return ex ? '#ff4d4f' : '#40f3ff'
          },
          borderColor: '#ffffff',
          borderWidth: 1.2
        },

        lineStyle: {
          color: '#40f3ff',
          width: 2,
          shadowColor: 'rgba(64, 243, 255, 0.35)',
          shadowBlur: 10
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 243, 255, 0.18)' },
              { offset: 1, color: 'rgba(64, 243, 255, 0.02)' }
            ]
          }
        },

        markLine: {
          symbol: 'none',
          silent: true,
          label: { color: '#ff7875', position: 'end' },
          lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1.5 },
          data: [...(th.hasMax ? [{ yAxis: th.max, label: { formatter: `上限：${formatNum(th.max)}` } }] : []), ...(th.hasMin ? [{ yAxis: th.min, label: { formatter: `下限：${formatNum(th.min)}` } }] : [])]
        }
      }
    ]
  }

  chartInstance.value.setOption(option, { notMerge: true, lazyUpdate: true })
  chartInstance.value.resize()
}

const loadSensorChart = async sensorCode => {
  try {
    const res = await getSensorLatest(sensorCode, 30)
    const data = res.data?.success ? res.data.data || [] : []
    const meta = selectedSensorMeta.value

    if (!data.length) {
      await updateChart([], [], meta)
      return
    }

    const times = data.map(item => {
      const date = new Date(item.created_at)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    })
    const values = data.map(item => Number(item.value))

    await updateChart(times, values, meta)
  } catch (err) {
    console.error('加载传感器曲线失败:', err)
  }
}

const handleSensorClick = async sensorCode => {
  if (!sensorCode) return
  selectedSensorCode.value = sensorCode
  await loadSensorChart(sensorCode)
}

// ===================== 主跨选择（态势 -> 钻取） =====================
const selectSection = async id => {
  selectedSectionId.value = id
  await nextTick()

  const sensors = currentSection.value?.viewSensors || []
  const best = sensors.find(s => s.exceeded) || sensors.find(s => s.warn) || sensors.find(s => !s.offline) || sensors[0]
  if (best?.sensor_code) await handleSensorClick(best.sensor_code)
}

// ===================== 告警联动 =====================
const handleAlarmFocus = async alarm => {
  const idx = sensorIdIndex.value.get(alarm.sensor_id)
  if (!idx) return

  // 1) 切桥
  if (idx.bridgeId !== selectedBridgeId.value) {
    selectedBridgeId.value = idx.bridgeId
    await nextTick()
  }

  // 2) 切主跨 + 3) 切传感器
  await selectSection(idx.sectionId)
  await handleSensorClick(idx.sensorCode)
}

// ===================== 刷新调度 =====================
const refreshAllData = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await Promise.all([loadOverview(), loadRealtimeData(), loadAlarms()])
    lastRefreshTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })

    if (selectedSensorCode.value) await loadSensorChart(selectedSensorCode.value)
  } finally {
    refreshing.value = false
  }
}

const startRefreshTimer = () => {
  stopRefreshTimer()
  refreshTimer = setInterval(refreshAllData, 10000)
}

const stopRefreshTimer = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
}

const handleResize = () => {
  chartInstance.value?.resize()
}

// 页面后台暂停轮询，回前台立即刷新
const handleVisibilityChange = async () => {
  if (document.hidden) {
    stopRefreshTimer()
  } else {
    await refreshAllData()
    startRefreshTimer()
  }
}

// 切桥：清空选择并默认选第一主跨（注意：实时数据可能稍后到，onMounted 也会兜底初始化）
watch(
  selectedBridgeId,
  async () => {
    selectedSensorCode.value = null
    selectedSectionId.value = null
    await nextTick()

    const firstSec = viewSections.value?.[0]
    if (firstSec?.id) await selectSection(firstSec.id)
  },
  { flush: 'post' }
)

// ===================== 告警自动滚动（按卡片固定节距） =====================
const alarmsListEl = ref(null)
let alarmScrollTimer = null
const alarmPaused = ref(false)

// 固定：卡片高度 120 + margin-bottom 8 => 节距 128
const ALARM_ROW_PITCH = 128

const startAlarmAutoScroll = () => {
  stopAlarmAutoScroll()
  alarmScrollTimer = setInterval(() => {
    if (alarmPaused.value) return
    const el = alarmsListEl.value
    if (!el) return
    if (el.scrollHeight <= el.clientHeight) return

    const maxTop = el.scrollHeight - el.clientHeight
    const nextTop = el.scrollTop + ALARM_ROW_PITCH
    el.scrollTo({ top: nextTop >= maxTop ? 0 : nextTop, behavior: 'smooth' })
  }, 2000)
}

const stopAlarmAutoScroll = () => {
  if (alarmScrollTimer) clearInterval(alarmScrollTimer)
  alarmScrollTimer = null
}

const pauseAlarmScroll = () => (alarmPaused.value = true)
const resumeAlarmScroll = () => (alarmPaused.value = false)

// ===================== 生命周期 =====================
onMounted(async () => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)

  await loadBridgesData()
  await refreshAllData()

  // 兜底：首次进入如果 watch 未选中主跨/传感器，则这里补选
  await nextTick()
  if (!selectedSectionId.value && viewSections.value?.[0]?.id) {
    await selectSection(viewSections.value[0].id)
  }

  startRefreshTimer()
  startAlarmAutoScroll()

  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopRefreshTimer()
  stopAlarmAutoScroll()

  if (timeTimer) clearInterval(timeTimer)
  timeTimer = null

  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
})
</script>

<template>
  <div class="screen">
    <header class="topbar">
      <div class="top-left">
        <span class="label">当前时间：</span>
        <span class="mono">{{ currentTime }}</span>
        <span class="muted">最后刷新：{{ lastRefreshTime || '--' }}</span>
      </div>

      <div class="top-mid">
        <span class="label">桥梁</span>
        <el-select v-model="selectedBridgeId" placeholder="请选择桥梁" size="large" style="width: 260px" class="bridge-select" popper-class="bridge-select-popper">
          <el-option v-for="bridge in bridgesData" :key="bridge.id" :label="bridge.name" :value="bridge.id" />
        </el-select>
      </div>

      <div class="top-right">
        <el-button class="refresh-btn" size="large" :loading="refreshing" @click="refreshAllData">手动刷新</el-button>
      </div>
    </header>

    <main class="grid">
      <!-- 左：态势 + 主跨 + 主跨传感器 -->
      <section class="panel left">
        <div class="panel-title">监测概览</div>

        <div class="kpi-row">
          <div class="kpi">
            <div class="k">桥梁总数</div>
            <div class="v">{{ overview.bridgeCount }}</div>
          </div>
          <div class="kpi">
            <div class="k">传感器总数</div>
            <div class="v">{{ overview.sensorCount }}</div>
          </div>
          <div class="kpi">
            <div class="k">在线率</div>
            <div class="v">{{ overview.onlineRate }}%</div>
          </div>
        </div>

        <div class="block">
          <div class="block-title">主跨状态（{{ currentBridge?.name || '未选择' }}）</div>

          <div v-if="!currentBridge" class="empty-tip">请选择桥梁</div>
          <div v-else-if="!viewSections.length" class="empty-tip">该桥梁暂无主跨数据</div>

          <div v-else class="sections-list">
            <div v-for="sec in sectionStats" :key="sec.id" class="section-card" :class="{ active: selectedSectionId === sec.id, danger: sec.alarmCount > 0 }" @click="selectSection(sec.id)">
              <div class="sec-name">{{ sec.name }}</div>
              <div class="sec-badges">
                <span class="b ok">正常 {{ sec.normalCount }}</span>
                <span class="b warn">预警 {{ sec.warnCount }}</span>
                <span class="b alarm">超限 {{ sec.alarmCount }}</span>
                <span class="b off">离线 {{ sec.offlineCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="block-title">
            主跨传感器（{{ currentSection?.name || '未选择' }}）
            <el-radio-group v-model="sensorFilter" size="small" style="margin-left: auto">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="alarm">超限</el-radio-button>
              <el-radio-button label="offline">离线</el-radio-button>
            </el-radio-group>
          </div>

          <div class="section-sensors">
            <div v-if="!currentSection" class="empty-tip">请先选择主跨</div>

            <template v-else>
              <div v-if="filteredSectionSensors.length === 0" class="empty-tip">暂无匹配传感器</div>

              <div v-for="s in filteredSectionSensors" :key="s.sensor_code" class="sensor-row" :class="{ active: selectedSensorCode === s.sensor_code, exceeded: s.exceeded, offline: s.offline }" @click="handleSensorClick(s.sensor_code)">
                <div class="row-top">
                  <span class="name" :title="s.sensor_name">{{ s.sensor_name }}</span>
                  <span class="muted">{{ getSensorTypeName(s.sensor_type) }}</span>
                </div>
                <div class="row-bottom">
                  <span class="val">{{ s.displayValue }}</span>
                  <span class="muted">{{ s.unit }}</span>

                  <span v-if="s.offline" class="tag off">离线</span>
                  <span v-else-if="s.exceeded" class="tag alarm">超限</span>
                  <span v-else-if="s.warn" class="tag warn">预警</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- 中：曲线主图 -->
      <section class="panel mid">
        <div class="panel-title">实时数据曲线</div>
        <div class="chart-container">
          <div v-if="!selectedSensorCode" class="empty-tip">请选择主跨中的传感器</div>
          <div ref="chartEl" class="chart" v-show="!!selectedSensorCode"></div>
        </div>
      </section>

      <!-- 右：告警中心 -->
      <aside class="panel right">
        <div class="panel-title">告警中心</div>

        <div class="alarm-kpi">
          <div>
            今日：
            <b>{{ overview.todayAlarms }}</b>
          </div>
          <div>
            未处理：
            <b class="danger">{{ overview.unhandledAlarms }}</b>
          </div>
        </div>

        <div ref="alarmsListEl" class="alarms-list" @mouseenter="pauseAlarmScroll" @mouseleave="resumeAlarmScroll">
          <div v-if="alarmsList.length === 0" class="empty-tip">暂无告警</div>

          <div v-for="alarm in alarmsList" :key="alarm.id" class="alarm-item" @click="handleAlarmFocus(alarm)">
            <div class="t mono">{{ alarm.created_at }}</div>
            <div class="bname" :title="alarm.bridge_name">{{ alarm.bridge_name }}</div>
            <div class="sname" :title="alarm.sensor_name">{{ alarm.sensor_name }}</div>
            <div class="msg" :title="alarm.msg">{{ alarm.msg }}</div>
            <div class="val">数值：{{ alarm.val }}</div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  color: rgba(255, 255, 255, 0.92);
}

.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  padding: 12px 14px;
  margin-bottom: 12px;

  border-radius: 12px;
  border: 1px solid rgba(64, 243, 255, 0.18);
  background: rgba(10, 18, 36, 0.45);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
}

.top-left,
.top-mid,
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.label {
  color: rgba(160, 180, 206, 0.95);
  font-size: 16px;
  white-space: nowrap;
}

.muted {
  color: rgba(160, 180, 206, 0.75);
  font-size: 16px;
  white-space: nowrap;
}

.mono {
  font-family: 'Courier New', monospace;
  color: rgba(160, 180, 206, 0.95);
  white-space: nowrap;
  margin: 0;
}

.grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 420px 1fr 440px;
  gap: 12px;
}

.panel {
  min-height: 0;
  display: flex;
  flex-direction: column;

  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(64, 243, 255, 0.18);
  background: rgba(10, 18, 36, 0.45);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
}

.panel-title {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 900;
  color: #40f3ff;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(64, 243, 255, 0.18);
}

/* KPI */
.kpi-row {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.kpi {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(64, 243, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
}

.kpi .k {
  font-size: 12px;
  color: rgba(160, 180, 206, 0.85);
  margin-bottom: 4px;
}

.kpi .v {
  font-size: 20px;
  font-weight: 900;
  color: #40f3ff;
}

.kpi .v.danger {
  color: #ff4d4f;
}

/* blocks */
.block {
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(160, 180, 206, 0.95);
  font-weight: 900;
  font-size: 13px;
  margin-bottom: 8px;
}

/* sections */
.sections-list {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.section-card {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(64, 243, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 8px;
  cursor: pointer;
  transition: 0.16s ease;
}

.section-card:hover {
  transform: translateX(2px);
  border-color: rgba(64, 243, 255, 0.25);
}

.section-card.active {
  border-color: rgba(64, 243, 255, 0.45);
  background: rgba(64, 243, 255, 0.08);
}

.section-card.danger {
  border-color: rgba(255, 77, 79, 0.45);
}

.sec-name {
  color: #7aa8ff;
  font-weight: 900;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sec-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.b {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.b.ok {
  color: #40f3ff;
  border-color: rgba(64, 243, 255, 0.25);
}

.b.warn {
  color: #ffa940;
  border-color: rgba(255, 169, 64, 0.25);
}

.b.alarm {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.25);
}

.b.off {
  color: rgba(160, 180, 206, 0.75);
  border-color: rgba(160, 180, 206, 0.2);
}

/* sensors */
.section-sensors {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.sensor-row {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(64, 243, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 8px;
  cursor: pointer;
  transition: 0.16s ease;
}

.sensor-row:hover {
  transform: translateX(2px);
  border-color: rgba(64, 243, 255, 0.25);
}

.sensor-row.active {
  border-color: rgba(64, 243, 255, 0.45);
  background: rgba(64, 243, 255, 0.08);
}

.sensor-row.exceeded {
  border-color: rgba(255, 77, 79, 0.55);
  background: rgba(255, 77, 79, 0.06);
}

.sensor-row.offline {
  opacity: 0.75;
}

.row-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.row-top .name {
  color: rgba(255, 255, 255, 0.92);
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-bottom {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
}

.row-bottom .val {
  font-size: 18px;
  font-weight: 900;
  color: #40f3ff;
}

.tag {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  white-space: nowrap;
}

.tag.off {
  color: rgba(160, 180, 206, 0.85);
  border: 1px solid rgba(160, 180, 206, 0.25);
}

.tag.warn {
  color: #ffa940;
  border: 1px solid rgba(255, 169, 64, 0.25);
}

.tag.alarm {
  color: #ff4d4f;
  border: 1px solid rgba(255, 77, 79, 0.25);
}

/* chart */
.chart-container {
  flex: 1;
  min-height: 0;
}

.chart {
  width: 100%;
  height: 100%;
}

/* alarms */
.alarm-kpi {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  color: rgba(160, 180, 206, 0.9);
  margin-bottom: 10px;
}

.alarm-kpi .danger {
  color: #ff4d4f;
}

.alarms-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.alarm-item {
  height: 120px; /* 配合 ALARM_ROW_PITCH */
  border: 1px solid rgba(255, 77, 79, 0.2);
  background: rgba(255, 77, 79, 0.06);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;

  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    't t'
    'bname sname'
    'msg msg'
    'val val';
  gap: 6px;
  box-sizing: border-box;
  transition: 0.16s ease;
}

.alarm-item:hover {
  transform: translateX(-2px);
  border-color: rgba(255, 77, 79, 0.35);
}

.alarm-item .t {
  grid-area: t;
}

.alarm-item .bname {
  grid-area: bname;
  color: #40f3ff;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-item .sname {
  grid-area: sname;
  color: #ffa940;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.alarm-item .msg {
  grid-area: msg;
  color: #ff7875;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-item .val {
  grid-area: val;
  color: #ff4d4f;
  font-weight: 900;
  text-align: right;
}

.empty-tip {
  text-align: center;
  color: rgba(160, 180, 206, 0.7);
  padding: 22px 10px;
  font-size: 14px;
}

/* scrollbars */
.sections-list::-webkit-scrollbar,
.section-sensors::-webkit-scrollbar,
.alarms-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.sections-list::-webkit-scrollbar-thumb,
.section-sensors::-webkit-scrollbar-thumb,
.alarms-list::-webkit-scrollbar-thumb {
  background: rgba(64, 243, 255, 0.22);
  border-radius: 3px;
}
.sections-list::-webkit-scrollbar-thumb:hover,
.section-sensors::-webkit-scrollbar-thumb:hover,
.alarms-list::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 243, 255, 0.35);
}
.sections-list::-webkit-scrollbar-track,
.section-sensors::-webkit-scrollbar-track,
.alarms-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.15);
}

/* =========================================================
   科技蓝：桥梁下拉框 + 下拉面板（修复白底 & 箭头）+ 手动刷新按钮
   需要模板上：
   <el-select class="bridge-select" popper-class="bridge-select-popper" ... />
   <el-button class="refresh-btn" ... />
   ========================================================= */

/* 选择框本体（input wrapper） */
:deep(.bridge-select) {
  --el-text-color-regular: rgba(235, 248, 255, 0.92);
  --el-fill-color-blank: transparent;
}

:deep(.bridge-select .el-input__wrapper) {
  position: relative;
  background: linear-gradient(180deg, rgba(10, 18, 36, 0.55), rgba(10, 18, 36, 0.28));
  border: 1px solid rgba(64, 243, 255, 0.26);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18), 0 0 18px rgba(64, 243, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 0 12px;
  transition: 0.16s ease;
}

:deep(.bridge-select .el-input__wrapper:hover) {
  border-color: rgba(64, 243, 255, 0.55);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2), 0 0 22px rgba(64, 243, 255, 0.18);
  transform: translateY(-1px);
}

:deep(.bridge-select.is-focus .el-input__wrapper) {
  border-color: rgba(64, 243, 255, 0.75);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(64, 243, 255, 0.12), 0 0 26px rgba(64, 243, 255, 0.22);
}

:deep(.bridge-select .el-input__inner) {
  color: rgba(235, 248, 255, 0.92);
  font-weight: 900;
  letter-spacing: 0.4px;
}

:deep(.bridge-select .el-select__caret) {
  color: rgba(64, 243, 255, 0.95);
}

/* popper 外层 */
:global(.bridge-select-popper) {
  --el-bg-color-overlay: rgba(10, 18, 36, 0.96);
  --el-border-color-light: rgba(64, 243, 255, 0.22);
  --el-text-color-regular: rgba(235, 248, 255, 0.88);
  --el-fill-color-light: rgba(64, 243, 255, 0.1);
}

/* 兼容不同版本：根可能是 el-popper 或 el-select__popper */
:global(.bridge-select-popper.el-popper),
:global(.bridge-select-popper.el-select__popper) {
  border: 1px solid rgba(64, 243, 255, 0.22) !important;
  background: transparent !important;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.42), 0 0 28px rgba(64, 243, 255, 0.12);
}

/* 面板本体：强制背景色 + 渐变（避免任何状态回白） */
:global(.bridge-select-popper .el-select-dropdown) {
  border: 0 !important;
  background-color: rgba(10, 18, 36, 0.96) !important;
  background-image: radial-gradient(100% 120% at 50% 0%, rgba(64, 243, 255, 0.14) 0%, rgba(10, 18, 36, 0.92) 55%, rgba(10, 18, 36, 0.96) 100%) !important;
  border-radius: 12px;
  overflow: hidden;
}

/* 内部滚动容器透明 */
:global(.bridge-select-popper .el-select-dropdown__wrap),
:global(.bridge-select-popper .el-scrollbar__wrap),
:global(.bridge-select-popper .el-scrollbar__view) {
  background: transparent !important;
}

/* 箭头同步深色（不然会像“白菱形/浅色块”） */
:global(.bridge-select-popper .el-popper__arrow::before) {
  background: rgba(10, 18, 36, 0.96) !important;
  border: 1px solid rgba(64, 243, 255, 0.22) !important;
}

/* 选项 */
:global(.bridge-select-popper .el-select-dropdown__item) {
  color: rgba(235, 248, 255, 0.85);
  font-weight: 800;
}

:global(.bridge-select-popper .el-select-dropdown__item:hover),
:global(.bridge-select-popper .el-select-dropdown__item.hover) {
  background: rgba(64, 243, 255, 0.1) !important;
}

:global(.bridge-select-popper .el-select-dropdown__item.selected) {
  color: #40f3ff !important;
  background: rgba(58, 139, 255, 0.16) !important;
}

/* 手动刷新按钮（科技蓝霓虹） */
.refresh-btn.el-button {
  position: relative;
  overflow: hidden;
  min-width: 140px; /* 新增这一行：设置最小宽度 */
  border-radius: 12px;
  border: 1px solid rgba(64, 243, 255, 0.3);
  color: rgba(235, 248, 255, 0.95);
  background: linear-gradient(180deg, rgba(58, 139, 255, 0.22), rgba(64, 243, 255, 0.08));
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18), 0 0 26px rgba(64, 243, 255, 0.18);
  font-weight: 900;
  letter-spacing: 0.5px;
  transition: 0.16s ease;
}

/* 霓虹边缘光 */
.refresh-btn.el-button::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(64, 243, 255, 0.9), rgba(58, 139, 255, 0.6), rgba(64, 243, 255, 0.35));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.55;
}

/* 扫光效果 */
.refresh-btn.el-button::before {
  content: '';
  position: absolute;
  top: -40%;
  left: -30%;
  width: 40%;
  height: 180%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
  transform: rotate(18deg);
  transition: 0.35s ease;
  pointer-events: none;
  opacity: 0;
}

.refresh-btn.el-button:hover {
  border-color: rgba(64, 243, 255, 0.65);
  background: linear-gradient(180deg, rgba(58, 139, 255, 0.3), rgba(64, 243, 255, 0.12));
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22), 0 0 34px rgba(64, 243, 255, 0.24);
  transform: translateY(-1px);
}

.refresh-btn.el-button:hover::before {
  left: 120%;
  opacity: 0.9;
}

.refresh-btn.el-button:active {
  transform: translateY(0);
}

.refresh-btn.el-button.is-loading {
  opacity: 0.88;
}
</style>
