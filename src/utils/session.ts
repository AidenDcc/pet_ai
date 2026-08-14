/**
 * 登录态持久化：勾选「记住我」写入 localStorage（跨会话保持），
 * 否则写入 sessionStorage（仅当前标签页有效）。读写收敛于此，
 * 供 auth store、请求拦截器与 mock 401 清理共用。
 */
const TOKEN_KEY = 'sp_token'
const ROLE_KEY = 'sp_role'
/** 登录方式：密码 / 验证码（决定设置里是否显示「修改密码」） */
const LOGIN_MODE_KEY = 'sp_login_mode'

export type LoginMode = 'pwd' | 'code'

function storageOf(persist: boolean): Storage {
  return persist ? localStorage : sessionStorage
}

export function getLoginMode(): LoginMode | '' {
  return (localStorage.getItem(LOGIN_MODE_KEY) || sessionStorage.getItem(LOGIN_MODE_KEY) || '') as LoginMode | ''
}

export function setLoginMode(mode: LoginMode, persist: boolean): void {
  localStorage.removeItem(LOGIN_MODE_KEY)
  sessionStorage.removeItem(LOGIN_MODE_KEY)
  storageOf(persist).setItem(LOGIN_MODE_KEY, mode)
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

export function getRole(): string {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || ''
}

/** 写入时先清空另一份，避免「旧 localStorage token + 新 sessionStorage token」并存 */
export function setToken(token: string, persist: boolean): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  storageOf(persist).setItem(TOKEN_KEY, token)
}

export function setRole(role: string, persist: boolean): void {
  localStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  storageOf(persist).setItem(ROLE_KEY, role)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(LOGIN_MODE_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(LOGIN_MODE_KEY)
}
