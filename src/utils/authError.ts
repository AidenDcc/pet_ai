type TranslateFn = (key: string, params?: Record<string, unknown>) => string

/** mock 业务码 -> i18n key（登录 / 注册 / 找回密码通用） */
const AUTH_ERROR_KEYS: Record<number, string> = {
  1001: 'login.errCredentials',
  1002: 'login.errDisabled',
  1010: 'login.roleMismatch',
}

/** 按业务码映射为 i18n 文案；无映射时兜底使用接口返回的 message */
export function authErrorMessage(e: unknown, t: TranslateFn): string {
  const code = (e as { code?: number } | null)?.code
  const key = code != null ? AUTH_ERROR_KEYS[code] : undefined
  return key ? t(key) : ((e as Error | null)?.message || t('login.failed'))
}
