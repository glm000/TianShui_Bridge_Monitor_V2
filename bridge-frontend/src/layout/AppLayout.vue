<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DataAnalysis, Monitor, Setting, User, Fold, Expand, SwitchButton, Bell, Warning, Document } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isCollapse = ref(false)

const menus = [
  { index: '/dashboard', title: '监测总览', icon: Monitor },
  { index: '/dashboard/alarms', title: '告警管理', icon: Warning },
  { index: '/dashboard/analysis', title: '数据分析', icon: DataAnalysis },
  { index: '/dashboard/settings', title: '系统设置', icon: Setting },
  { index: '/dashboard/users', title: '用户管理', icon: User },
  { index: '/dashboard/logs', title: '操作日志', icon: Document }
]

const activeMenu = computed(() => route.path)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(r => r.meta?.title)
  if (!matched.length) return [{ title: '首页', path: '/dashboard' }]
  return matched.map(r => ({ title: r.meta.title, path: r.path }))
})

const usePanel = computed(() => route.meta?.noPanel !== true)

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出系统吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      localStorage.removeItem('token')
      ElMessage.success('已安全退出')
      router.push('/')
    })
    .catch(() => {})
}
</script>

<template>
  <el-container class="layout-container">
    <!-- 左侧侧边栏 -->
    <el-aside :width="isCollapse ? '72px' : '260px'" class="app-sidebar">
      <div class="sidebar-logo" :class="{ collapsed: isCollapse }">
        <svg viewBox="0 0 120 120" class="logo-svg">
          <path d="M10 90 H110" stroke="#40f3ff" stroke-width="10" stroke-linecap="round" />
          <path d="M15 90 Q60 20 105 90" fill="none" stroke="#40f3ff" stroke-width="10" stroke-linecap="round" />
          <path d="M60 45 V90 M35 65 V90 M85 65 V90" stroke="#40f3ff" stroke-width="8" stroke-linecap="round" />
        </svg>
        <span v-if="!isCollapse" class="logo-text">桥梁监测系统</span>
      </div>

      <el-scrollbar class="sidebar-scroll">
        <el-menu class="el-menu-vertical" :default-active="activeMenu" :collapse="isCollapse" :collapse-transition="false" router background-color="transparent" text-color="rgba(160, 180, 206, 0.95)" active-text-color="#40f3ff">
          <el-menu-item v-for="m in menus" :key="m.index" :index="m.index">
            <el-icon><component :is="m.icon" /></el-icon>
            <span>{{ m.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar-footer" v-if="!isCollapse">
        <span class="dot"></span>
        <span class="status">在线</span>
        <span class="ver">v1.0</span>
      </div>
    </el-aside>

    <!-- 右侧主体 -->
    <el-container class="app-right">
      <!-- 顶部 Header -->
      <el-header class="app-header">
        <!-- 左侧：折叠 + 面包屑 -->
        <div class="header-left">
          <el-icon class="trigger-btn" @click="isCollapse = !isCollapse">
            <component :is="isCollapse ? Expand : Fold" />
          </el-icon>

          <el-breadcrumb separator="/" class="app-breadcrumb">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(b, i) in breadcrumbs" :key="b.path + i" :to="i < breadcrumbs.length - 1 ? { path: b.path } : undefined">
              {{ b.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <!-- 中间：科技感标题（新增） -->
        <div class="header-center" aria-label="系统标题">
          <div class="tech-title">
            <span class="tech-title__line left"></span>
            <span class="tech-title__text">桥梁结构健康监测系统</span>
            <span class="tech-title__line right"></span>
          </div>
        </div>

        <!-- 右侧：消息 + 用户 -->
        <div class="header-right">
          <el-tooltip content="系统消息" placement="bottom">
            <div class="icon-btn">
              <el-badge is-dot>
                <el-icon><Bell /></el-icon>
              </el-badge>
            </div>
          </el-tooltip>

          <el-dropdown trigger="click" popper-class="dark-popper">
            <div class="user-info">
              <img src="@/assets/avatar.png" class="user-avatar" />
              <span class="user-name">管理员 Admin</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容 -->
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <div v-if="usePanel" class="page-panel" :key="route.fullPath">
              <component :is="Component" />
            </div>
            <component v-else :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </el-main>

      <el-footer class="app-footer">© 2026 陕西三为云测智能科技有限公司 - Bridge Health Monitor System</el-footer>
    </el-container>
  </el-container>
</template>

<style scoped>
/* ===== 主题与背景 ===== */
.layout-container {
  height: 100vh;
  width: 100vw;

  --bg-0: #070b16;
  --bg-1: #0b1630;
  --stroke: rgba(64, 243, 255, 0.18);
  --text-0: rgba(255, 255, 255, 0.92);
  --text-1: rgba(160, 180, 206, 0.95);
  --primary: #40f3ff;

  color: var(--text-0);
  background: radial-gradient(1200px 600px at 20% 10%, rgba(64, 243, 255, 0.12), transparent 55%), radial-gradient(900px 500px at 80% 20%, rgba(64, 201, 255, 0.1), transparent 60%), linear-gradient(180deg, var(--bg-0), var(--bg-1));
  overflow: hidden;
}

.app-right {
  min-width: 0;
}

/* ===== Sidebar ===== */
.app-sidebar {
  background: linear-gradient(180deg, rgba(13, 26, 51, 0.92), rgba(9, 18, 38, 0.92));
  border-right: 1px solid var(--stroke);
  box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(64, 243, 255, 0.12);
  background: linear-gradient(90deg, rgba(64, 243, 255, 0.08), transparent);
  user-select: none;
}

.logo-svg {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(64, 243, 255, 0.55));
}

.logo-text {
  color: var(--text-0);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1.5px;
  white-space: nowrap;
}

.sidebar-scroll {
  height: calc(100vh - 60px - 44px);
  padding: 8px 8px 10px;
}

.sidebar-footer {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-top: 1px solid rgba(64, 243, 255, 0.12);
  color: var(--text-1);
  font-size: 12px;
}
.sidebar-footer .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #21d19f;
  box-shadow: 0 0 10px rgba(33, 209, 159, 0.85);
}
.sidebar-footer .ver {
  margin-left: auto;
  opacity: 0.8;
}

/* Menu */
.el-menu-vertical {
  border-right: none;
  background: transparent;
}

:deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  border-radius: 10px;
  margin: 6px 0;
  position: relative;
}

:deep(.el-menu-item:hover) {
  background: rgba(64, 243, 255, 0.1) !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(64, 243, 255, 0.18), rgba(64, 243, 255, 0.04)) !important;
  color: #fff !important;
  box-shadow: inset 0 0 0 1px rgba(64, 243, 255, 0.2);
  text-shadow: 0 0 12px rgba(64, 243, 255, 0.45);
}

:deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: -8px;
  top: 10px;
  width: 3px;
  height: 24px;
  border-radius: 2px;
  background: var(--primary);
  box-shadow: 0 0 14px rgba(64, 243, 255, 0.9);
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
}

/* ===== Header ===== */
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;

  height: 60px;
  padding: 0 18px;

  background: rgba(10, 18, 36, 0.55);
  border-bottom: 1px solid rgba(64, 243, 255, 0.14);
  backdrop-filter: blur(12px);

  display: flex;
  align-items: center;
  justify-content: space-between;

  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

/* 左右固定宽度，保证中间标题“视觉居中” */
/* 左右固定宽度，保证中间标题视觉居中（略放宽中间空间） */
.header-left,
.header-right {
  flex: 0 0 360px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.header-right {
  justify-content: flex-end;
  gap: 18px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

/* 科技感标题 */
/* ===== 大气科技感标题（替换原 tech-title 全套） ===== */
/* ===== 大屏可视化标题样式（替换原 tech-title 全套） ===== */
.tech-title {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;

  padding: 12px 26px;
  max-width: 100%;

  /* 切角外形（大屏常用） */
  clip-path: polygon(18px 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0% 50%);

  background: linear-gradient(180deg, rgba(12, 28, 54, 0.78), rgba(8, 18, 38, 0.58));
  border: 1px solid rgba(64, 243, 255, 0.22);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35), 0 0 26px rgba(64, 243, 255, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

/* 上下“刻度/栅格”纹理（大屏仪表感） */
.tech-title::after {
  content: '';
  position: absolute;
  inset: 8px 18px;
  background: repeating-linear-gradient(90deg, rgba(64, 243, 255, 0.14) 0px, rgba(64, 243, 255, 0.14) 1px, transparent 1px, transparent 10px);
  opacity: 0.2;
  pointer-events: none;
  mask-image: linear-gradient(180deg, transparent, #000 20%, #000 80%, transparent);
}

/* 边框“流光扫描” */
.tech-title::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: conic-gradient(from 180deg, transparent 0 20%, rgba(64, 243, 255, 0.65) 30%, transparent 42%, transparent 100%);
  filter: blur(0.2px);
  opacity: 0.55;
  animation: frame-sweep 3.6s linear infinite;
  pointer-events: none;

  /* 只显示边缘一圈 */
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 1px;
}

@keyframes frame-sweep {
  to {
    transform: rotate(360deg);
  }
}

/* 中间文字：更“大屏标题”感觉（更粗更宽，略加描边感） */
.tech-title__text {
  position: relative;
  font-weight: 950;
  letter-spacing: 8px;
  font-size: 22px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  background: linear-gradient(90deg, #f3feff 0%, #40f3ff 35%, #7aa8ff 70%, #f3feff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;

  text-shadow: 0 0 22px rgba(64, 243, 255, 0.22), 0 0 44px rgba(64, 243, 255, 0.1);
}

/* 底部能量条（动态呼吸） */
.tech-title__text::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -12px;
  width: 74%;
  height: 3px;
  transform: translateX(-50%);
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(64, 243, 255, 0.95), transparent);
  box-shadow: 0 0 18px rgba(64, 243, 255, 0.35);
  animation: energy-pulse 1.8s ease-in-out infinite;
}

@keyframes energy-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: translateX(-50%) scaleX(0.92);
  }
  50% {
    opacity: 0.95;
    transform: translateX(-50%) scaleX(1.02);
  }
}

/* 两侧导轨：更像大屏左右延伸装饰 */
.tech-title__line {
  width: 110px;
  height: 2px;
  position: relative;
  opacity: 0.9;
  background: linear-gradient(90deg, transparent, rgba(64, 243, 255, 0.95), transparent);
}

.tech-title__line::before,
.tech-title__line::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translateY(-50%) rotate(45deg);
  background: rgba(64, 243, 255, 0.25);
  border: 1px solid rgba(64, 243, 255, 0.65);
  box-shadow: 0 0 14px rgba(64, 243, 255, 0.35);
}

.tech-title__line.left::before {
  right: 10px;
}
.tech-title__line.left::after {
  right: 28px;
  opacity: 0.6;
}
.tech-title__line.right::before {
  left: 10px;
}
.tech-title__line.right::after {
  left: 28px;
  opacity: 0.6;
}

/* 响应式：屏幕窄时收敛装饰 */
@media (max-width: 1100px) {
  .tech-title__line {
    display: none;
  }
  .tech-title__text {
    font-size: 18px;
    letter-spacing: 5px;
  }
  .tech-title {
    padding: 10px 18px;
  }
}

.trigger-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--text-1);
  transition: color 0.2s ease;
}
.trigger-btn:hover {
  color: var(--primary);
}

:deep(.el-breadcrumb__inner),
:deep(.el-breadcrumb__separator) {
  color: rgba(255, 255, 255, 0.72) !important;
}
:deep(.el-breadcrumb__inner.is-link:hover) {
  color: var(--primary) !important;
}

.icon-btn {
  font-size: 20px;
  color: var(--text-1);
  cursor: pointer;
  height: 24px;
  transition: color 0.2s ease;
}
.icon-btn:hover {
  color: var(--primary);
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(64, 243, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  transition: 0.2s ease;
}
.user-info:hover {
  border-color: rgba(64, 243, 255, 0.24);
  background: rgba(64, 243, 255, 0.06);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.user-name {
  font-size: 14px;
  color: var(--text-0);
  font-weight: 600;
  white-space: nowrap;
}

/* ========== 内容区域 ========== */
.app-main {
  background-color: transparent;
  padding: 0; /* 大屏模式去掉内边距 */
  overflow: hidden; /* 禁止滚动 */
  flex: 1; /* 填满剩余空间 */
  display: flex;
  flex-direction: column;
}

.app-main::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(64, 243, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(64, 243, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.22;
  pointer-events: none;
}

.page-panel {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(64, 243, 255, 0.14);
  border-radius: 14px;
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  padding: 16px;
  min-height: calc(100vh - 60px - 40px - 36px);
}

/* 切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ===== Footer ===== */
.app-footer {
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  background: transparent;
  border-top: 1px solid rgba(64, 243, 255, 0.1);
}

/* ===== 下拉菜单：深色科技风（修复白底与文字看不清）===== */
:global(.dark-popper.el-popper),
:global(.dark-popper) {
  border: 1px solid rgba(64, 243, 255, 0.22) !important;
  background: rgba(8, 16, 34, 0.92) !important;
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45);
}

/* 菜单容器本身也会有背景色，需要一并覆盖 */
:global(.dark-popper .el-dropdown-menu) {
  background: transparent !important;
  border: none !important;
  padding: 6px !important;
}

/* 菜单项文字颜色 */
:global(.dark-popper .el-dropdown-menu__item) {
  color: rgba(255, 255, 255, 0.88) !important;
}

/* hover 高亮 */
:global(.dark-popper .el-dropdown-menu__item:not(.is-disabled):hover) {
  background: rgba(64, 243, 255, 0.14) !important;
  color: #fff !important;
}

/* 分割线颜色 */
:global(.dark-popper .el-dropdown-menu__item--divided) {
  border-top: 1px solid rgba(64, 243, 255, 0.14) !important;
}

/* 箭头（小三角）也要改深色，否则会显得“白” */
:global(.dark-popper .el-popper__arrow::before) {
  background: rgba(8, 16, 34, 0.92) !important;
  border: 1px solid rgba(64, 243, 255, 0.22) !important;
}
</style>
