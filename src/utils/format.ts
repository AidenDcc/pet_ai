import dayjs from 'dayjs'
import { i18n } from '@/locales'

export function formatTime(ts: number | string, fmt = 'MM-DD HH:mm'): string {
  return dayjs(ts).format(fmt)
}

export function formatDateTime(ts: number | string): string {
  return dayjs(ts).format('YYYY-MM-DD HH:mm')
}

export function formatDate(ts: number | string): string {
  return dayjs(ts).format('YYYY-MM-DD')
}

/** 相对时间（随界面语言切换）：刚刚 / n 分钟前 / n 小时前 / n 天前 */
export function relativeTime(ts: number | string): string {
  const t = i18n.global.t
  const diff = Date.now() - dayjs(ts).valueOf()
  if (diff < 60000) return t('common.justNow')
  if (diff < 3600000) return t('common.minuteAgo', { n: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('common.hourAgo', { n: Math.floor(diff / 3600000) })
  return t('common.dayAgo', { n: Math.floor(diff / 86400000) })
}

export function percent(value: number, total: number): number {
  if (!total) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export function money(value: number): string {
  const locale = i18n.global.locale.value === 'en-US' ? 'en-US' : 'zh-CN'
  return `¥${value.toLocaleString(locale, { minimumFractionDigits: 2 })}`
}

/** 年龄（按生日字符串计算，近似整年） */
export function ageOf(birth: string): number {
  return dayjs().diff(dayjs(birth), 'year')
}
