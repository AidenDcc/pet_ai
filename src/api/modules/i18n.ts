import request from '../request'
import type { I18nEntry } from '@/types'

/** 获取全量词条（基础 + 覆盖），供运行时合并与运营端配置页使用 */
export function getI18nEntriesApi() {
  return request.get<unknown, I18nEntry[]>('/i18n')
}

/** 保存词条覆盖（运营端） */
export function saveI18nEntryApi(entry: I18nEntry) {
  return request.post<unknown, I18nEntry>('/i18n', entry)
}

/** 删除词条覆盖（运营端） */
export function deleteI18nEntryApi(key: string) {
  return request.delete<unknown, { ok: boolean }>(`/i18n/${key}`)
}
