import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 运行时主题：宠物主 APP（用户端）与 APP 登录页使用活力橙，
 * 医生端 / 运营端保持原有青色。class 加在 body 上，保证 Vant / Element
 * 挂载到 body 的弹层、Toast 也能继承橙色变量。
 */
export function useTheme() {
  const auth = useAuthStore()
  const route = useRoute()

  // 仅宠物主端认证页使用橙色主题；医生端 / 平台端登录注册走默认青色
  const AUTH_PATHS = ['/user/login', '/user/register', '/user/forgot', '/agreement']

  watch(
    [() => auth.role, () => route.path],
    () => {
      const isAppAuth = AUTH_PATHS.some((p) => route.path.startsWith(p))
      const isOrange = isAppAuth || auth.role === 'user'
      document.body.classList.toggle('theme-orange', isOrange)
    },
    { immediate: true },
  )
}
