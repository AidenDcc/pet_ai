import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, logoutApi, getMeApi } from '@/api/modules/auth'
import { HOME_PATH } from '@/utils/consts'
import type { Role, UserInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('sp_token') || '')
  const role = ref((localStorage.getItem('sp_role') || '') as Role | '')
  const user = ref<UserInfo | null>(null)

  async function login(account: string, password: string): Promise<UserInfo> {
    const res = await loginApi({ account, password })
    token.value = res.token
    role.value = res.user.role
    user.value = res.user
    localStorage.setItem('sp_token', res.token)
    localStorage.setItem('sp_role', res.user.role)
    return res.user
  }

  async function fetchMe(): Promise<void> {
    if (!token.value) return
    const me = await getMeApi()
    user.value = me
    role.value = me.role
  }

  function homePath(): string {
    return role.value ? HOME_PATH[role.value as Role] : '/login'
  }

  function logout(): void {
    logoutApi().catch(() => {
      // mock 环境忽略登出接口异常
    })
    token.value = ''
    role.value = ''
    user.value = null
    localStorage.removeItem('sp_token')
    localStorage.removeItem('sp_role')
  }

  return { token, role, user, login, fetchMe, homePath, logout }
})
