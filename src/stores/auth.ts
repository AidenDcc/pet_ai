import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, loginByCodeApi, logoutApi, getMeApi } from '@/api/modules/auth'
import { HOME_PATH } from '@/utils/consts'
import { getToken, getRole, setToken, setRole, clearSession } from '@/utils/session'
import type { Role, UserInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const role = ref((getRole() || '') as Role | '')
  const user = ref<UserInfo | null>(null)

  /**
   * 密码登录。
   * @param role 当前登录入口角色（mock 与前端据此校验账号归属）
   * @param remember 勾选「记住我」则跨会话保持，否则仅当前标签页
   */
  async function login(
    account: string,
    password: string,
    role?: Role,
    remember = true,
  ): Promise<UserInfo> {
    const res = await loginApi({ account, password, role })
    return persistSession(res.token, res.user, role, remember)
  }

  /** 验证码登录（手机号 / 邮箱 + 验证码） */
  async function loginByCode(
    account: string,
    code: string,
    role?: Role,
    remember = true,
  ): Promise<UserInfo> {
    const res = await loginByCodeApi({ account, code, role })
    return persistSession(res.token, res.user, role, remember)
  }

  /** 统一写入会话：校验角色匹配后持久化 token / role / user */
  function persistSession(resToken: string, resUser: UserInfo, expectedRole?: Role, remember = true): UserInfo {
    if (expectedRole && resUser.role !== expectedRole) {
      // 安全网：服务端未拦截时也不写入会话，抛出带业务码的错误供页面映射 i18n
      clearSession()
      token.value = ''
      role.value = ''
      user.value = null
      const e = new Error('role mismatch') as Error & { code?: number }
      e.code = 1010
      throw e
    }
    token.value = resToken
    role.value = resUser.role
    user.value = resUser
    setToken(resToken, remember)
    setRole(resUser.role, remember)
    return resUser
  }

  async function fetchMe(): Promise<void> {
    if (!token.value) return
    const me = await getMeApi()
    user.value = me
    role.value = me.role
  }

  function homePath(): string {
    return role.value ? HOME_PATH[role.value as Role] : '/user/login'
  }

  function logout(): void {
    logoutApi().catch(() => {
      // mock 环境忽略登出接口异常
    })
    clearSession()
    token.value = ''
    role.value = ''
    user.value = null
  }

  return { token, role, user, login, loginByCode, fetchMe, homePath, logout }
})
