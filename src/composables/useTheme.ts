import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 运行时主题：宠物主 APP（用户端）与 APP 登录页使用活力橙，
 * 平台运营端（Admin 桌面 + 平台登录/注册/找回）使用薄荷绿，
 * 医生端保持原有青色。class 加在 body 上，保证 Vant / Element
 * 挂载到 body 的弹层、Toast 也能继承对应变量。
 */
export function useTheme() {
  const auth = useAuthStore()
  const route = useRoute()

  // 仅宠物主端认证页使用橙色主题
  const AUTH_PATHS = ['/user/login', '/user/register', '/user/forgot', '/agreement']

  watch(
    [() => auth.role, () => route.path],
    () => {
      const isAppAuth = AUTH_PATHS.some((p) => route.path.startsWith(p))
      const isOrange = isAppAuth || auth.role === 'user'
      // 平台运营端：admin 角色，或访问 /admin 开头的登录/注册/找回等公开页
      const isAdmin = auth.role === 'admin' || route.path.startsWith('/admin')
      document.body.classList.toggle('theme-orange', isOrange)
      document.body.classList.toggle('theme-admin', isAdmin)
    },
    { immediate: true },
  )
}
