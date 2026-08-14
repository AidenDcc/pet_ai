/**
 * 设置相关前端辅助：清除缓存。
 * 缓存大小按 localStorage 实际占用计量；首次进入写入模拟缓存占位，
 * 清除时保留登录态与语言偏好键。
 */

const CACHE_SEED_KEY = 'sp_cache_mock'
/** 清除缓存白名单：登录态 + 语言偏好（必须保留） */
const CACHE_WHITELIST = ['sp_token', 'sp_role', 'sp_locale', 'sp_login_mode']

/** 模拟缓存占位文本（~4.4MB，靠近 localStorage 配额上限但安全） */
function seedText(): string {
  return 'cache.' + 'x'.repeat(4_400_000)
}

/** 首次进入时写入模拟缓存，让「清除缓存」有真实占用可清 */
export function ensureCacheSeed(): void {
  try {
    if (!localStorage.getItem(CACHE_SEED_KEY)) {
      localStorage.setItem(CACHE_SEED_KEY, seedText())
    }
  } catch {
    // 配额异常时忽略，仅按实际内容计量
  }
}

/** 计算本地缓存占用（MB，含 key+value 字符数） */
export function measureCacheSizeMb(): number {
  let units = 0
  for (const key of Object.keys(localStorage)) {
    const v = localStorage.getItem(key)
    units += key.length + (v ? v.length : 0)
  }
  return units / (1024 * 1024)
}

/** 清除非登录态缓存（localStorage + sessionStorage 白名单外键） */
export function clearNonAuthCache(): void {
  for (const key of Object.keys(localStorage)) {
    if (!CACHE_WHITELIST.includes(key)) localStorage.removeItem(key)
  }
  for (const key of Object.keys(sessionStorage)) {
    if (!CACHE_WHITELIST.includes(key)) sessionStorage.removeItem(key)
  }
}
