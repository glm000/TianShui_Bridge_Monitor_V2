<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>系统设置 - 桥梁/主跨/传感器管理</h2>
    </div>

    <div class="settings-content">
      <!-- 左侧树形导航 -->
      <div class="tree-panel">
        <div class="tree-header">
          <h3>结构导航</h3>
          <el-button type="primary" size="small" @click="refreshTree" :loading="treeLoading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-tree :data="treeData" :props="treeProps" node-key="key" default-expand-all highlight-current @node-click="handleNodeClick" class="tree-component">
          <template #default="{ node, data }">
            <span class="tree-node">
              <el-icon v-if="data.type === 'root'" class="root-icon"><Folder /></el-icon>
              <el-icon v-else-if="data.type === 'bridge'"><OfficeBuilding /></el-icon>
              <el-icon v-else-if="data.type === 'section'"><Location /></el-icon>
              <span class="node-label">{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>

      <!-- 右侧管理面板 -->
      <div class="management-panel">
        <!-- 面包屑导航 -->
        <div class="breadcrumb">
          <el-breadcrumb separator=">">
            <el-breadcrumb-item @click="goToLevel('bridge')" class="clickable">桥梁管理</el-breadcrumb-item>
            <el-breadcrumb-item v-if="selectedBridge" @click="goToLevel('section')" class="clickable">
              {{ selectedBridge.name }}
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="selectedSection">
              {{ selectedSection.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <!-- 桥梁列表 (点击根节点"桥梁管理") -->
        <div v-if="currentLevel === 'bridge'" class="table-container">
          <div class="section-title">
            <h3>桥梁列表</h3>
          </div>
          <div class="table-toolbar">
            <el-button type="primary" @click="openBridgeDialog()">
              <el-icon><Plus /></el-icon>
              新增桥梁
            </el-button>
            <el-button @click="loadBridges">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
          <el-table :data="bridges" stripe v-loading="loading" border>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="桥梁名称" min-width="150" />
            <el-table-column prop="location" label="位置" min-width="200" />
            <el-table-column prop="lng" label="经度" width="120" />
            <el-table-column prop="lat" label="纬度" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="warning" size="small" @click="openBridgeDialog(row)">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDeleteBridge(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && bridges.length === 0" description="暂无桥梁数据" />
        </div>

        <!-- 主跨管理 (点击桥梁节点) -->
        <div v-if="currentLevel === 'section'" class="content-container">
          <!-- 桥梁信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><OfficeBuilding /></el-icon>
                  桥梁信息: {{ selectedBridge?.name }}
                </span>
                <div class="card-actions">
                  <el-button type="warning" size="small" @click="openBridgeDialog(selectedBridge)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" @click="handleDeleteBridge(selectedBridge)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">位置:</span>
                <span class="info-value">{{ selectedBridge?.location || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">经度:</span>
                <span class="info-value">{{ selectedBridge?.lng || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">纬度:</span>
                <span class="info-value">{{ selectedBridge?.lat || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建时间:</span>
                <span class="info-value">{{ selectedBridge?.created_at || '-' }}</span>
              </div>
            </div>
          </el-card>

          <!-- 主跨列表 -->
          <div class="table-container">
            <div class="section-title">
              <h3>主跨列表</h3>
            </div>
            <div class="table-toolbar">
              <el-button type="primary" @click="openSectionDialog()">
                <el-icon><Plus /></el-icon>
                新增主跨
              </el-button>
              <el-button @click="loadSections(selectedBridge?.id)">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
            <el-table :data="sections" stripe v-loading="loading" border>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="主跨名称" min-width="150" />
              <el-table-column prop="description" label="描述" min-width="200" />
              <el-table-column prop="lng" label="经度" width="120" />
              <el-table-column prop="lat" label="纬度" width="120" />
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="warning" size="small" @click="openSectionDialog(row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="handleDeleteSection(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!loading && sections.length === 0" description="暂无主跨数据，请添加主跨" />
          </div>
        </div>

        <!-- 传感器管理 (点击主跨节点) -->
        <div v-if="currentLevel === 'sensor'" class="content-container">
          <!-- 主跨信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Location /></el-icon>
                  主跨信息: {{ selectedSection?.name }}
                </span>
                <div class="card-actions">
                  <el-button type="warning" size="small" @click="openSectionDialog(selectedSection)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" @click="handleDeleteSection(selectedSection)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">所属桥梁:</span>
                <span class="info-value">{{ selectedBridge?.name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">描述:</span>
                <span class="info-value">{{ selectedSection?.description || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">经度:</span>
                <span class="info-value">{{ selectedSection?.lng || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">纬度:</span>
                <span class="info-value">{{ selectedSection?.lat || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">X位置%:</span>
                <span class="info-value">{{ selectedSection?.pos_x || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Y位置%:</span>
                <span class="info-value">{{ selectedSection?.pos_y || '-' }}</span>
              </div>
            </div>
          </el-card>

          <!-- 传感器列表 -->
          <div class="table-container">
            <div class="section-title">
              <h3>传感器列表</h3>
            </div>
            <div class="table-toolbar">
              <el-button type="primary" @click="openSensorDialog()">
                <el-icon><Plus /></el-icon>
                新增传感器
              </el-button>
              <el-button @click="loadSensors(selectedSection?.id)">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
            <el-table :data="sensors" stripe v-loading="loading" border>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="sensor_code" label="传感器编码" min-width="150" />
              <el-table-column prop="sensor_name" label="传感器名称" min-width="150" />
              <el-table-column prop="sensor_type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getSensorTypeTag(row.sensor_type)">
                    {{ getSensorTypeName(row.sensor_type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="unit" label="单位" width="80" />
              <el-table-column prop="limit_max" label="上限" width="100" />
              <el-table-column prop="limit_min" label="下限" width="100" />
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="warning" size="small" @click="openSensorDialog(row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="handleDeleteSensor(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!loading && sensors.length === 0" description="暂无传感器数据，请添加传感器" />
          </div>
        </div>
      </div>
    </div>

    <!-- 桥梁新增/编辑对话框 -->
    <el-dialog v-model="bridgeDialogVisible" :title="bridgeForm.id ? '编辑桥梁' : '新增桥梁'" width="600px" @close="resetBridgeForm">
      <el-form :model="bridgeForm" :rules="bridgeRules" ref="bridgeFormRef" label-width="100px">
        <el-form-item label="桥梁名称" prop="name">
          <el-input v-model="bridgeForm.name" placeholder="请输入桥梁名称" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="bridgeForm.location" placeholder="请输入位置" />
        </el-form-item>
        <el-form-item label="经度" prop="lng">
          <el-input-number v-model="bridgeForm.lng" :precision="6" :step="0.000001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="纬度" prop="lat">
          <el-input-number v-model="bridgeForm.lat" :precision="6" :step="0.000001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="图片URL" prop="image_url">
          <el-input v-model="bridgeForm.image_url" placeholder="请输入图片URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bridgeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBridgeForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 主跨新增/编辑对话框 -->
    <el-dialog v-model="sectionDialogVisible" :title="sectionForm.id ? '编辑主跨' : '新增主跨'" width="600px" @close="resetSectionForm">
      <el-form :model="sectionForm" :rules="sectionRules" ref="sectionFormRef" label-width="100px">
        <el-form-item label="主跨名称" prop="name">
          <el-input v-model="sectionForm.name" placeholder="请输入主跨名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="sectionForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="经度" prop="lng">
          <el-input-number v-model="sectionForm.lng" :precision="6" :step="0.000001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="纬度" prop="lat">
          <el-input-number v-model="sectionForm.lat" :precision="6" :step="0.000001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="X位置%" prop="pos_x">
          <el-input-number v-model="sectionForm.pos_x" :precision="2" :step="0.01" :min="0" :max="100" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Y位置%" prop="pos_y">
          <el-input-number v-model="sectionForm.pos_y" :precision="2" :step="0.01" :min="0" :max="100" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="图片URL" prop="image_url">
          <el-input v-model="sectionForm.image_url" placeholder="请输入图片URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sectionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSectionForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 传感器新增/编辑对话框 -->
    <el-dialog v-model="sensorDialogVisible" :title="sensorForm.id ? '编辑传感器' : '新增传感器'" width="600px" @close="resetSensorForm">
      <el-form :model="sensorForm" :rules="sensorRules" ref="sensorFormRef" label-width="120px">
        <el-form-item label="传感器编码" prop="sensor_code">
          <el-input v-model="sensorForm.sensor_code" placeholder="请输入传感器编码（唯一）" />
        </el-form-item>
        <el-form-item label="传感器名称" prop="sensor_name">
          <el-input v-model="sensorForm.sensor_name" placeholder="请输入传感器名称" />
        </el-form-item>
        <el-form-item label="传感器类型" prop="sensor_type">
          <el-select v-model="sensorForm.sensor_type" placeholder="请选择传感器类型" style="width: 100%">
            <el-option label="位移" value="disp" />
            <el-option label="倾斜角" value="press" />
            <el-option label="振动" value="vib" />
            <el-option label="挠度" value="rebar" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="sensorForm.unit" placeholder="请输入单位" />
        </el-form-item>
        <el-form-item label="上限阈值" prop="limit_max">
          <el-input-number v-model="sensorForm.limit_max" :precision="4" :step="0.0001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下限阈值" prop="limit_min">
          <el-input-number v-model="sensorForm.limit_min" :precision="4" :step="0.0001" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="X位置%" prop="pos_x">
          <el-input-number v-model="sensorForm.pos_x" :precision="2" :step="0.01" :min="0" :max="100" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Y位置%" prop="pos_y">
          <el-input-number v-model="sensorForm.pos_y" :precision="2" :step="0.01" :min="0" :max="100" :controls="false" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sensorDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSensorForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, OfficeBuilding, Location, Monitor, Edit, Delete, Folder } from '@element-plus/icons-vue'
import { getAllBridges, createBridge, updateBridge, deleteBridge, getSectionsByBridge, createSection, updateSection, deleteSection, getSensorsBySection, createSensor, updateSensor, deleteSensor } from '../api/settings.js'

// ===================== 状态管理 =====================
const loading = ref(false)
const treeLoading = ref(false)
const submitting = ref(false)

const currentLevel = ref('bridge') // 'bridge' | 'section' | 'sensor'
const selectedBridge = ref(null) // 当前选中的桥梁对象
const selectedSection = ref(null) // 当前选中的主跨对象

const bridges = ref([])
const sections = ref([])
const sensors = ref([])

const treeData = ref([])
const treeProps = {
  children: 'children',
  label: 'label'
}

// ===================== 桥梁表单 =====================
const bridgeDialogVisible = ref(false)
const bridgeFormRef = ref(null)
const bridgeForm = ref({
  id: null,
  name: '',
  location: '',
  lng: null,
  lat: null,
  image_url: ''
})
const bridgeRules = {
  name: [{ required: true, message: '请输入桥梁名称', trigger: 'blur' }]
}

// ===================== 主跨表单 =====================
const sectionDialogVisible = ref(false)
const sectionFormRef = ref(null)
const sectionForm = ref({
  id: null,
  bridge_id: null,
  name: '',
  description: '',
  lng: null,
  lat: null,
  pos_x: null,
  pos_y: null,
  image_url: ''
})
const sectionRules = {
  name: [{ required: true, message: '请输入主跨名称', trigger: 'blur' }]
}

// ===================== 传感器表单 =====================
const sensorDialogVisible = ref(false)
const sensorFormRef = ref(null)
const sensorForm = ref({
  id: null,
  section_id: null,
  sensor_code: '',
  sensor_name: '',
  sensor_type: '',
  limit_max: null,
  limit_min: null,
  unit: '',
  pos_x: null,
  pos_y: null
})
const sensorRules = {
  sensor_code: [{ required: true, message: '请输入传感器编码', trigger: 'blur' }],
  sensor_name: [{ required: true, message: '请输入传感器名称', trigger: 'blur' }],
  sensor_type: [{ required: true, message: '请选择传感器类型', trigger: 'change' }]
}

// ===================== 树形数据构建 =====================
const buildTreeData = async () => {
  treeLoading.value = true
  try {
    const res = await getAllBridges()
    if (res.data.success) {
      const bridgesData = res.data.data
      const bridgeNodes = []

      for (const bridge of bridgesData) {
        const bridgeNode = {
          key: `bridge-${bridge.id}`,
          label: bridge.name,
          type: 'bridge',
          data: bridge,
          children: []
        }

        // 获取该桥梁的主跨
        try {
          const sectionsRes = await getSectionsByBridge(bridge.id)
          if (sectionsRes.data.success) {
            const sectionsData = sectionsRes.data.data

            for (const section of sectionsData) {
              const sectionNode = {
                key: `section-${section.id}`,
                label: section.name,
                type: 'section',
                data: section,
                bridgeData: bridge,
                children: []
              }

              bridgeNode.children.push(sectionNode)
            }
          }
        } catch (err) {
          console.error('获取主跨失败', err)
        }

        bridgeNodes.push(bridgeNode)
      }

      // 创建根节点
      const rootNode = {
        key: 'root',
        label: '桥梁管理',
        type: 'root',
        children: bridgeNodes
      }

      treeData.value = [rootNode]
    }
  } catch (err) {
    ElMessage.error('加载树形数据失败')
    console.error(err)
  } finally {
    treeLoading.value = false
  }
}

const refreshTree = () => {
  buildTreeData()
}

// ===================== 树节点点击 =====================
const handleNodeClick = data => {
  if (data.type === 'root') {
    // 点击"桥梁管理"根节点 → 显示所有桥梁列表
    currentLevel.value = 'bridge'
    selectedBridge.value = null
    selectedSection.value = null
    loadBridges()
  } else if (data.type === 'bridge') {
    // 点击桥梁节点 → 显示桥梁信息 + 主跨列表
    currentLevel.value = 'section'
    selectedBridge.value = data.data
    selectedSection.value = null
    loadSections(data.data.id)
  } else if (data.type === 'section') {
    // 点击主跨节点 → 显示主跨信息 + 传感器列表
    currentLevel.value = 'sensor'
    selectedBridge.value = data.bridgeData
    selectedSection.value = data.data
    loadSensors(data.data.id)
  }
}

// 面包屑导航点击
const goToLevel = level => {
  if (level === 'bridge') {
    currentLevel.value = 'bridge'
    selectedBridge.value = null
    selectedSection.value = null
    loadBridges()
  } else if (level === 'section') {
    currentLevel.value = 'section'
    selectedSection.value = null
    loadSections(selectedBridge.value.id)
  }
}

// ===================== 桥梁管理 =====================
const loadBridges = async () => {
  loading.value = true
  try {
    const res = await getAllBridges()
    if (res.data.success) {
      bridges.value = res.data.data
    }
  } catch (err) {
    ElMessage.error('加载桥梁列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openBridgeDialog = (row = null) => {
  if (row) {
    bridgeForm.value = { ...row }
  } else {
    resetBridgeForm()
  }
  bridgeDialogVisible.value = true
}

const resetBridgeForm = () => {
  bridgeForm.value = {
    id: null,
    name: '',
    location: '',
    lng: null,
    lat: null,
    image_url: ''
  }
  bridgeFormRef.value?.clearValidate()
}

const submitBridgeForm = async () => {
  const valid = await bridgeFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (bridgeForm.value.id) {
      const res = await updateBridge(bridgeForm.value.id, bridgeForm.value)
      if (res.data.success) {
        ElMessage.success('修改成功')
        bridgeDialogVisible.value = false
        loadBridges()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '修改失败')
      }
    } else {
      const res = await createBridge(bridgeForm.value)
      if (res.data.success) {
        ElMessage.success('新增成功')
        bridgeDialogVisible.value = false
        loadBridges()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '新增失败')
      }
    }
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const handleDeleteBridge = row => {
  ElMessageBox.confirm(`确定要删除桥梁"${row.name}"吗？此操作将同时删除该桥梁下的所有主跨和传感器！`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteBridge(row.id)
        if (res.data.success) {
          ElMessage.success('删除成功')
          loadBridges()
          buildTreeData()
        } else {
          ElMessage.error(res.data.msg || '删除失败')
        }
      } catch (err) {
        ElMessage.error('删除失败')
        console.error(err)
      }
    })
    .catch(() => {})
}

// ===================== 主跨管理 =====================
const loadSections = async bridgeId => {
  const targetBridgeId = bridgeId || selectedBridge.value?.id
  if (!targetBridgeId) return

  loading.value = true
  try {
    const res = await getSectionsByBridge(targetBridgeId)
    if (res.data.success) {
      sections.value = res.data.data
    }
  } catch (err) {
    ElMessage.error('加载主跨列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openSectionDialog = (row = null) => {
  if (row) {
    sectionForm.value = { ...row }
  } else {
    resetSectionForm()
    sectionForm.value.bridge_id = selectedBridge.value?.id
  }
  sectionDialogVisible.value = true
}

const resetSectionForm = () => {
  sectionForm.value = {
    id: null,
    bridge_id: null,
    name: '',
    description: '',
    lng: null,
    lat: null,
    pos_x: null,
    pos_y: null,
    image_url: ''
  }
  sectionFormRef.value?.clearValidate()
}

const submitSectionForm = async () => {
  const valid = await sectionFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (sectionForm.value.id) {
      const res = await updateSection(sectionForm.value.id, sectionForm.value)
      if (res.data.success) {
        ElMessage.success('修改成功')
        sectionDialogVisible.value = false
        loadSections()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '修改失败')
      }
    } else {
      const res = await createSection(sectionForm.value)
      if (res.data.success) {
        ElMessage.success('新增成功')
        sectionDialogVisible.value = false
        loadSections()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '新增失败')
      }
    }
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const handleDeleteSection = row => {
  ElMessageBox.confirm(`确定要删除主跨"${row.name}"吗？此操作将同时删除该主跨下的所有传感器！`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteSection(row.id)
        if (res.data.success) {
          ElMessage.success('删除成功')
          loadSections()
          buildTreeData()
        } else {
          ElMessage.error(res.data.msg || '删除失败')
        }
      } catch (err) {
        ElMessage.error('删除失败')
        console.error(err)
      }
    })
    .catch(() => {})
}

// ===================== 传感器管理 =====================
const loadSensors = async sectionId => {
  const targetSectionId = sectionId || selectedSection.value?.id
  if (!targetSectionId) return

  loading.value = true
  try {
    const res = await getSensorsBySection(targetSectionId)
    if (res.data.success) {
      sensors.value = res.data.data
    }
  } catch (err) {
    ElMessage.error('加载传感器列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openSensorDialog = (row = null) => {
  if (row) {
    sensorForm.value = { ...row }
  } else {
    resetSensorForm()
    sensorForm.value.section_id = selectedSection.value?.id
  }
  sensorDialogVisible.value = true
}

const resetSensorForm = () => {
  sensorForm.value = {
    id: null,
    section_id: null,
    sensor_code: '',
    sensor_name: '',
    sensor_type: '',
    limit_max: null,
    limit_min: null,
    unit: '',
    pos_x: null,
    pos_y: null
  }
  sensorFormRef.value?.clearValidate()
}

const submitSensorForm = async () => {
  const valid = await sensorFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (sensorForm.value.id) {
      const res = await updateSensor(sensorForm.value.id, sensorForm.value)
      if (res.data.success) {
        ElMessage.success('修改成功')
        sensorDialogVisible.value = false
        loadSensors()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '修改失败')
      }
    } else {
      const res = await createSensor(sensorForm.value)
      if (res.data.success) {
        ElMessage.success('新增成功')
        sensorDialogVisible.value = false
        loadSensors()
        buildTreeData()
      } else {
        ElMessage.error(res.data.msg || '新增失败')
      }
    }
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const handleDeleteSensor = row => {
  ElMessageBox.confirm(`确定要删除传感器"${row.sensor_name}"吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteSensor(row.id)
        if (res.data.success) {
          ElMessage.success('删除成功')
          loadSensors()
          buildTreeData()
        } else {
          ElMessage.error(res.data.msg || '删除失败')
        }
      } catch (err) {
        ElMessage.error('删除失败')
        console.error(err)
      }
    })
    .catch(() => {})
}

// ===================== 辅助函数 =====================
const getSensorTypeName = type => {
  const map = {
    disp: '位移',
    press: '倾斜角',
    vib: '振动',
    rebar: '挠度'
  }
  return map[type] || type
}

const getSensorTypeTag = type => {
  const map = {
    disp: 'success',
    press: 'warning',
    vib: 'danger',
    rebar: 'primary'
  }
  return map[type] || ''
}

// ===================== 生命周期 =====================
onMounted(() => {
  buildTreeData()
  loadBridges()
})
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e4e7ed;
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 500;
}

.settings-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.tree-panel {
  width: 280px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tree-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tree-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  font-weight: 500;
}

.tree-component {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.root-icon {
  color: #409eff;
  font-weight: bold;
}

.node-label {
  font-size: 14px;
}

.management-panel {
  flex: 1;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.breadcrumb :deep(.el-breadcrumb__item .clickable) {
  cursor: pointer;
  color: #409eff;
  font-weight: normal;
}

.breadcrumb :deep(.el-breadcrumb__item .clickable:hover) {
  text-decoration: underline;
}

.content-container {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.info-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-label {
  color: #909399;
  font-size: 14px;
  min-width: 80px;
}

.info-value {
  color: #303133;
  font-size: 14px;
  word-break: break-all;
}

.table-container {
  flex: 1;
  overflow: auto;
}

.section-title {
  margin-bottom: 16px;
}

.section-title h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  font-weight: 500;
}

.table-toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background: #f5f7fa;
  color: #606266;
  font-weight: 500;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>
