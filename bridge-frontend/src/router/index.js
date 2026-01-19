import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layout/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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

export default router
