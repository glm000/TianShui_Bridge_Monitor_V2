import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layout/AppLayout.vue'

const router = createRouter({
  history: createWebHistory('/bridge/'),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
          meta: { title: '监测总览' },
          noPanel: true
        },
        {
          path: 'analysis',
          name: 'analysis',
          component: () => import('../views/AnalysisView.vue'),
          meta: { title: '数据分析' }
        },
        {
          path: 'alarms',
          name: 'alarms',
          component: () => import('../views/AlarmView.vue'),
          meta: { title: '告警管理' },
          noPanel: true // 关键：禁用 AppLayout 的默认白色面板，使用我们自定义的布局
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
          meta: { title: '用户管理' }
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('../views/LogsView.vue'),
          meta: { title: '操作日志' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingsView.vue'),
          meta: { title: '系统设置' }
        }
      ]
    }
  ]
})


// ==========================================
// 🔒 核心修复：全局路由守卫
// ==========================================
router.beforeEach((to, from, next) => {
  // 1. 读取登录标记 (注意：这里必须和 LoginView.vue 里存储的 key 一致)
  // 如果您想做更严格的校验，可以检查 userInfo 是否为 null 或 "undefined"
  const userInfo = sessionStorage.getItem('userInfo')
  const isAuthenticated = userInfo && userInfo !== 'undefined'

  // 2. 拦截逻辑
  if (to.name !== 'login' && !isAuthenticated) {
    // 如果要去非登录页，且没登录 -> 强制踢回登录页
    console.warn('未登录，强制跳转至登录页')
    next({ name: 'login' })
  } else {
    // 其他情况（去登录页，或者已登录） -> 放行
    next()
  }
})

export default router
