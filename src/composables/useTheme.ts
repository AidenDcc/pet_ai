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

  watch(
    [() => auth.role, () => route.path],
    () => {
      const isAppLogin = route.path.startsWith('/login')
      const isOrange = isAppLogin || auth.role === 'user'
      document.body.classList.toggle('theme-orange', isOrange)
    },
    { immediate: true },
  )
}
