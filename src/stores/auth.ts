import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, loginByCodeApi, logoutApi, getMeApi } from '@/api/modules/auth'
import { HOME_PATH } from '@/utils/consts'
import { getToken, getRole, setToken, setRole, clearSession, getLoginMode, setLoginMode, type LoginMode } from '@/utils/session'
import type { Role, UserInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const role = ref((getRole() || '') as Role | '')
  const user = ref<UserInfo | null>(null)
  /** 当前会话登录方式：pwd / code（决定设置里是否显示「修改密码」） */
  const loginMode = ref<LoginMode | ''>(getLoginMode())

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
    return persistSession(res.token, res.user, role, remember, 'pwd')
  }

  /** 验证码登录（手机号 / 邮箱 + 验证码） */
  async function loginByCode(
    account: string,
    code: string,
    role?: Role,
    remember = true,
  ): Promise<UserInfo> {
    const res = await loginByCodeApi({ account, code, role })
    return persistSession(res.token, res.user, role, remember, 'code')
  }

  /** 统一写入会话：校验角色匹配后持久化 token / role / user */
  function persistSession(resToken: string, resUser: UserInfo, expectedRole?: Role, remember = true, mode?: LoginMode): UserInfo {
    if (expectedRole && resUser.role !== expectedRole) {
      // 安全网：服务端未拦截时也不写入会话，抛出带业务码的错误供页面映射 i18n
      clearSession()
      token.value = ''
      role.value = ''
      user.value = null
      loginMode.value = ''
      const e = new Error('role mismatch') as Error & { code?: number }
      e.code = 1010
      throw e
    }
    token.value = resToken
    role.value = resUser.role
    user.value = resUser
    setToken(resToken, remember)
    setRole(resUser.role, remember)
    if (mode) {
      loginMode.value = mode
      setLoginMode(mode, remember)
    }
    return resUser
  }

  async function fetchMe(): Promise<void> {
    if (!token.value) return
    const me = await getMeApi()
    user.value = me
    role.value = me.role
  }

  /** 更新当前登录用户字段（账号信息保存后同步，避免二次请求） */
  function setUser(patch: Partial<UserInfo>): void {
    if (user.value) user.value = { ...user.value, ...patch }
    else user.value = patch as UserInfo
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
    loginMode.value = ''
  }

  return { token, role, user, loginMode, login, loginByCode, fetchMe, setUser, homePath, logout }
})
