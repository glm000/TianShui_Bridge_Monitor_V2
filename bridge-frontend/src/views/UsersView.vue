<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <p class="page-desc">管理系统用户账号，支持增删改查和权限管理</p>
    </div>

    <div class="users-content">
      <!-- 搜索和操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="searchKeyword" placeholder="搜索用户名、姓名、手机号" clearable style="width: 300px" @clear="loadUsers" @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="searchRole" placeholder="角色筛选" clearable style="width: 150px" @change="handleSearch">
            <el-option label="全部角色" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="openUserDialog()">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>
          <el-button @click="loadUsers">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 用户表格 -->
      <el-table :data="users" stripe v-loading="loading" border class="users-table">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="real_name" label="姓名" min-width="100" />
        <el-table-column prop="role" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="handleStatusChange(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column prop="last_login" label="最后登录" width="180" />
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openUserDialog(row)">编辑</el-button>
            <el-button type="warning" size="small" @click="openPasswordDialog(row)">重置密码</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :page-sizes="[10, 20, 50, 100]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper" @size-change="loadUsers" @current-change="loadUsers" />
      </div>
    </div>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog v-model="userDialogVisible" :title="userForm.id ? '编辑用户' : '新增用户'" width="600px" @close="resetUserForm">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="!!userForm.id" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!userForm.id">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="userForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="userForm.id">
          <el-radio-group v-model="userForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUserForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="重置密码" width="500px" @close="resetPasswordForm">
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-alert title="提示：重置后的新密码请妥善保管" type="warning" :closable="false" show-icon style="margin-bottom: 20px" />
        <el-form-item label="用户" prop="username">
          <el-input v-model="passwordForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="passwordForm.password" type="password" placeholder="请输入新密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPasswordForm" :loading="submitting">确定重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
import { getUserList, createUser, updateUser, deleteUser, resetUserPassword, updateUserStatus } from '../api/user.js'

// ===================== 状态管理 =====================
const loading = ref(false)
const submitting = ref(false)

const searchKeyword = ref('')
const searchRole = ref('')

const users = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// ===================== 用户表单 =====================
const userDialogVisible = ref(false)
const userFormRef = ref(null)
const userForm = ref({
  id: null,
  username: '',
  password: '',
  real_name: '',
  role: 'user',
  phone: '',
  email: '',
  status: 1
})

const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
}

// ===================== 密码重置表单 =====================
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordForm = ref({
  id: null,
  username: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// ===================== 数据加载 =====================
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value,
      role: searchRole.value
    }
    const res = await getUserList(params)
    if (res.data.success) {
      users.value = res.data.data.list || []
      pagination.total = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.message || '加载用户列表失败')
    }
  } catch (err) {
    ElMessage.error('加载用户列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

// ===================== 用户管理 =====================
const openUserDialog = (row = null) => {
  if (row) {
    userForm.value = { ...row }
  } else {
    resetUserForm()
  }
  userDialogVisible.value = true
}

const resetUserForm = () => {
  userForm.value = {
    id: null,
    username: '',
    password: '',
    real_name: '',
    role: 'user',
    phone: '',
    email: '',
    status: 1
  }
  userFormRef.value?.clearValidate()
}

const submitUserForm = async () => {
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (userForm.value.id) {
      // 编辑
      const res = await updateUser(userForm.value.id, userForm.value)
      if (res.data.success) {
        ElMessage.success('修改成功')
        userDialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.data.message || '修改失败')
      }
    } else {
      // 新增
      const res = await createUser(userForm.value)
      if (res.data.success) {
        ElMessage.success('新增成功')
        userDialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.data.message || '新增失败')
      }
    }
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户"${row.username} (${row.real_name})"吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteUser(row.id)
        if (res.data.success) {
          ElMessage.success('删除成功')
          loadUsers()
        } else {
          ElMessage.error(res.data.message || '删除失败')
        }
      } catch (err) {
        ElMessage.error('删除失败')
        console.error(err)
      }
    })
    .catch(() => {})
}

const handleStatusChange = async (row) => {
  try {
    const res = await updateUserStatus(row.id, row.status)
    if (res.data.success) {
      ElMessage.success(`用户已${row.status ? '启用' : '禁用'}`)
    } else {
      ElMessage.error(res.data.message || '状态修改失败')
      row.status = row.status === 1 ? 0 : 1
    }
  } catch (err) {
    ElMessage.error('状态修改失败')
    row.status = row.status === 1 ? 0 : 1
    console.error(err)
  }
}

// ===================== 密码重置 =====================
const openPasswordDialog = (row) => {
  passwordForm.value = {
    id: row.id,
    username: row.username,
    password: '',
    confirmPassword: ''
  }
  passwordDialogVisible.value = true
}

const resetPasswordForm = () => {
  passwordForm.value = {
    id: null,
    username: '',
    password: '',
    confirmPassword: ''
  }
  passwordFormRef.value?.clearValidate()
}

const submitPasswordForm = async () => {
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const res = await resetUserPassword(passwordForm.value.id, passwordForm.value.password)
    if (res.data.success) {
      ElMessage.success('密码重置成功')
      passwordDialogVisible.value = false
    } else {
      ElMessage.error(res.data.message || '密码重置失败')
    }
  } catch (err) {
    ElMessage.error('密码重置失败')
    console.error(err)
  } finally {
    submitting.value = false
  }
}

// ===================== 辅助函数 =====================
const getRoleName = (role) => {
  const map = {
    admin: '管理员',
    user: '普通用户',
    guest: '访客'
  }
  return map[role] || role
}

const getRoleType = (role) => {
  const map = {
    admin: 'danger',
    user: 'success',
    guest: 'info'
  }
  return map[role] || ''
}

// ===================== 生命周期 =====================
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
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
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 500;
}

.page-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.users-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.users-table {
  flex: 1;
  overflow: auto;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

</style>
