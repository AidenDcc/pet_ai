import { createRouter, createWebHistory } from 'vue-router'
import { publicRoutes, userRoutes, doctorRoutes, adminRoutes } from './routes'
import { LOGIN_PATH } from '@/utils/consts'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [...publicRoutes, ...userRoutes, ...doctorRoutes, ...adminRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // 公开页面（登录 / 注册 / 找回各端入口）
  if (to.meta.public) {
    const pageRole = to.meta.role as Role | undefined
    // 已登录且访问自己所属端的登录页 → 直接回到首页
    if (pageRole && auth.token && auth.role === pageRole) {
      return auth.homePath()
    }
    return true
  }

  // 需登录 → 按所属端跳转对应登录页
  if (!auth.token) {
    const required = (to.meta.role as Role | undefined) ?? 'user'
    return { path: LOGIN_PATH[required], query: { redirect: to.fullPath } }
  }

  // 角色校验
  const required = to.meta.role as Role | undefined
  if (required && required !== auth.role) {
    return auth.homePath()
  }
  return true
})

export default router
