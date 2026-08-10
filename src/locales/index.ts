import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'
import type { I18nEntry } from '@/types'

export type { I18nEntry }

export type AppLocale = 'zh-CN' | 'en-US'

export const SUPPORT_LOCALES: AppLocale[] = ['zh-CN', 'en-US']

/** 基础词条（扁平 key -> 双语值） */
export type MessageDict = Record<string, { zh: string; en: string }>

/** 基础 messages（嵌套对象，与 locale 文件一致） */
export const baseMessages: Record<AppLocale, typeof zhCN> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

/** 嵌套对象拍平为 a.b.c -> string */
export function flattenMessages(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[key] = v
    else if (v && typeof v === 'object') Object.assign(out, flattenMessages(v as Record<string, unknown>, key))
  }
  return out
}

/** 拍平字典还原为嵌套对象 */
export function unflattenMessages(dict: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(dict)) {
    const parts = key.split('.')
    let node = out
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!node[p] || typeof node[p] !== 'object') node[p] = {}
      node = node[p] as Record<string, unknown>
    }
    node[parts[parts.length - 1]] = value
  }
  return out
}

/** 深合并：b 覆盖 a（返回新对象，不修改入参；保持 a 的静态类型） */
export function deepMerge<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out as T
}

export function getInitialLocale(): AppLocale {
  const saved = localStorage.getItem('sp_locale') || ''
  return (SUPPORT_LOCALES as string[]).includes(saved) ? (saved as AppLocale) : 'zh-CN'
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})
