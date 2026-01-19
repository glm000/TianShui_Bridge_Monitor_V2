<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Iphone, Lock } from '@element-plus/icons-vue'
// 登录页中导入
import { post } from '@/request.js'

const router = useRouter()
const loading = ref(false)

const form = reactive({
  username: '', // 已清空默认值
  password: ''
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入完整的账号和密码')
    return
  }

  loading.value = true

  try {
    const res = await post('/api/user/login', {
      username: form.username,
      password: form.password
    })

    if (res.data.success) {
      // 保存用户信息到 localStorage
      localStorage.setItem('userInfo', JSON.stringify(res.data.user))
      
      ElMessage.success('欢迎回来！登录成功')
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } else {
      ElMessage.error(res.data.message || '账号或密码错误')
    }
  } catch (error) {
    // 区分不同类型的错误
    if (error.response) {
      // 服务器返回了错误响应（如 401、500 等）
      const message = error.response.data?.message || '账号或密码错误'
      ElMessage.error(message)
    } else if (error.request) {
      // 请求已发送但没有收到响应（网络错误）
      ElMessage.error('无法连接到服务器，请检查网络连接')
    } else {
      // 其他错误
      ElMessage.error('登录失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- 背景层 -->
    <div class="bg-layer">
      <div class="lines"></div>
      <div class="particles">
        <span v-for="n in 12" :key="n" class="star"></span>
      </div>
    </div>

    <!-- 顶部 Header -->
    <div class="header-section">
      <div class="logo-icon">
        <svg viewBox="0 0 100 50" width="70" height="35">
          <path d="M10,45 Q50,0 90,45" fill="none" stroke="#409eff" stroke-width="3" />
          <line x1="25" y1="30" x2="25" y2="45" stroke="#409eff" stroke-width="2" />
          <line x1="50" y1="15" x2="50" y2="45" stroke="#409eff" stroke-width="2" />
          <line x1="75" y1="30" x2="75" y2="45" stroke="#409eff" stroke-width="2" />
          <line x1="10" y1="45" x2="90" y2="45" stroke="#409eff" stroke-width="2" />
        </svg>
      </div>
      <h1 class="main-title">天水市桥梁结构健康监测系统</h1>
      <p class="sub-title">BRIDGE MONITORING SYSTEM</p>

      <div class="tags">
        <span>实时监测</span>
        <span class="dot">•</span>
        <span>智能预警</span>
        <span class="dot">•</span>
        <span>安全守护</span>
      </div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>

      <div class="form-body">
        <!-- 账号输入框 -->
        <el-input v-model="form.username" placeholder="请输入账号" class="custom-input" :prefix-icon="Iphone" clearable />

        <!-- 密码输入框 -->
        <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password class="custom-input" :prefix-icon="Lock" @keyup.enter="handleLogin" />

        <button class="gradient-btn" :class="{ processing: loading }" @click="handleLogin" :disabled="loading">
          {{ loading ? '登 录 中...' : '登 录' }}
        </button>
      </div>

      <div class="card-footer">
        <span class="status-dot"></span>
        <span>系统运行正常</span>
      </div>
    </div>

    <div class="copyright">© 2026 陕西三为云测智能科技有限公司 版权所有</div>
  </div>
</template>

<style scoped>
/* ========== 全局容器 ========== */
.login-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: radial-gradient(ellipse at center, #1b3b6f 0%, #0d1a33 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

/* 背景纹理 */
.bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.lines {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(90deg, transparent 0, transparent 80px, rgba(255, 255, 255, 0.02) 80px, rgba(255, 255, 255, 0.02) 81px), linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px);
  background-size: 100% 100%, 40px 40px;
  mask-image: radial-gradient(circle at center, black 0%, transparent 80%);
}
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.star {
  position: absolute;
  bottom: -20px;
  background: rgba(64, 201, 255, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(64, 201, 255, 0.8);
  animation: floatUp infinite ease-in-out;
  opacity: 0;
}
@keyframes floatUp {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-90vh);
    opacity: 0;
  }
}
.star:nth-child(1) {
  left: 10%;
  width: 4px;
  height: 4px;
  animation-duration: 8s;
  animation-delay: 0s;
  background: #67c23a;
}
.star:nth-child(2) {
  left: 25%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
  animation-delay: 2s;
}
.star:nth-child(3) {
  left: 40%;
  width: 5px;
  height: 5px;
  animation-duration: 6s;
  animation-delay: 1s;
  background: #fff;
}
.star:nth-child(4) {
  left: 55%;
  width: 4px;
  height: 4px;
  animation-duration: 9s;
  animation-delay: 3s;
  background: #e6a23c;
}
.star:nth-child(5) {
  left: 70%;
  width: 6px;
  height: 6px;
  animation-duration: 11s;
  animation-delay: 0.5s;
  background: #409eff;
}
.star:nth-child(6) {
  left: 85%;
  width: 3px;
  height: 3px;
  animation-duration: 14s;
  animation-delay: 4s;
}
.star:nth-child(7) {
  left: 15%;
  width: 4px;
  height: 4px;
  animation-duration: 7s;
  animation-delay: 2.5s;
  background: #5be1b8;
}

/* ========== Header Section ========== */
.header-section {
  z-index: 10;
  text-align: center;
  margin-bottom: 35px;
}
.logo-icon {
  margin-bottom: 10px;
}
.main-title {
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 4px;
  margin: 5px 0;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
.sub-title {
  font-size: 12px;
  color: #8bb6db;
  letter-spacing: 3px;
  margin: 5px 0 15px;
}
.tags {
  font-size: 13px;
  color: #8bb6db;
  letter-spacing: 2px;
  opacity: 0.8;
}
.dot {
  margin: 0 6px;
  color: #409eff;
}

/* ========== Login Card ========== */
.login-card {
  z-index: 10;
  width: 420px;
  padding: 40px;
  background: rgba(13, 30, 60, 0.65);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(64, 158, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  position: relative;
  text-align: center;
}
.corner {
  position: absolute;
  width: 15px;
  height: 15px;
  border-color: #409eff;
  border-style: solid;
  border-width: 0;
  transition: all 0.3s;
  opacity: 0.8;
}
.corner-tl {
  top: -1px;
  left: -1px;
  border-top-width: 2px;
  border-left-width: 2px;
  border-top-left-radius: 8px;
}
.corner-tr {
  top: -1px;
  right: -1px;
  border-top-width: 2px;
  border-right-width: 2px;
  border-top-right-radius: 8px;
}
.corner-bl {
  bottom: -1px;
  left: -1px;
  border-bottom-width: 2px;
  border-left-width: 2px;
  border-bottom-left-radius: 8px;
}
.corner-br {
  bottom: -1px;
  right: -1px;
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-bottom-right-radius: 8px;
}
.login-card:hover .corner {
  border-color: #5be1b8;
  box-shadow: 0 0 8px #5be1b8;
}

/* ========== Input Styles ========== */
.form-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:deep(.custom-input .el-input__wrapper) {
  background-color: rgba(30, 50, 80, 0.6) !important;
  box-shadow: none !important;
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 6px;
  padding: 8px 15px;
  transition: 0.3s;
}

:deep(.custom-input .el-input__wrapper:hover),
:deep(.custom-input .el-input__wrapper.is-focus) {
  background-color: rgba(30, 50, 80, 0.9) !important;
  border-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.2) !important;
}

:deep(.custom-input .el-input__inner) {
  color: #fff;
  height: 38px;
}

/* 图标颜色 */
:deep(.custom-input .el-input__prefix-inner) {
  color: #8bb6db;
  font-size: 16px;
}

/* 强制清除图标只要出现就一直显示 (通过 Override 默认的 hover 逻辑) */
:deep(.custom-input .el-input__suffix) {
  display: inline-flex !important;
}
:deep(.custom-input .el-input__clear) {
  display: inline-flex !important;
  color: #8bb6db !important;
  font-size: 16px;
}
:deep(.custom-input .el-input__clear:hover) {
  color: #fff !important;
}
:deep(.custom-input .el-input__password) {
  color: #8bb6db !important;
  font-size: 16px;
}
:deep(.custom-input .el-input__password:hover) {
  color: #fff !important;
}

/* 按钮 */
.gradient-btn {
  margin-top: 10px;
  width: 100%;
  height: 48px;
  border: none;
  background: linear-gradient(90deg, #40c9ff 0%, #59c66c 100%);
  border-radius: 24px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 4px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(64, 201, 255, 0.3);
  transition: 0.2s;
}
.gradient-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(89, 198, 108, 0.4);
}
.gradient-btn:active {
  transform: scale(0.98);
}

/* 底部 */
.card-footer {
  margin-top: 25px;
  font-size: 12px;
  color: #8bb6db;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.status-dot {
  width: 6px;
  height: 6px;
  background-color: #67c23a;
  border-radius: 50%;
  box-shadow: 0 0 5px #67c23a;
  animation: blink 2s infinite;
}
.copyright {
  position: absolute;
  bottom: 20px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.3);
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
