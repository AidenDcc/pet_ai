import { createRouter, createWebHistory } from 'vue-router'
import { publicRoutes, userRoutes, doctorRoutes, adminRoutes } from './routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [...publicRoutes, ...userRoutes, ...doctorRoutes, ...adminRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // 公开页面
  if (to.meta.public) {
    if (to.path === '/login' && auth.token && auth.role) {
      return auth.homePath()
    }
    return true
  }

  // 需登录
  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 角色校验
  const required = to.meta.role as string | undefined
  if (required && required !== auth.role) {
    return auth.homePath()
  }
  return true
})

export default router
