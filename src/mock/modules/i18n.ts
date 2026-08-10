import type { I18nEntry } from '@/types'
import { defineMock, MockError, requireRole } from '../helper'
import { flattenMessages, baseMessages } from '@/locales'

const STORAGE_KEY = 'sp_i18n_entries'
type OverrideMap = Record<string, { zh: string; en: string }>

function readOverrides(): OverrideMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as OverrideMap
  } catch {
    return {}
  }
}

function writeOverrides(map: OverrideMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/** 基础词条 + 运营端覆盖 = 全量词条（按 key 排序） */
function allEntries(): I18nEntry[] {
  const baseZh = flattenMessages(baseMessages['zh-CN'])
  const baseEn = flattenMessages(baseMessages['en-US'])
  const over = readOverrides()
  const keys = new Set([...Object.keys(baseZh), ...Object.keys(baseEn), ...Object.keys(over)])
  const list: I18nEntry[] = []
  for (const key of keys) {
    list.push({
      key,
      zh: over[key]?.zh ?? baseZh[key] ?? '',
      en: over[key]?.en ?? baseEn[key] ?? '',
      isOverride: Boolean(over[key]),
    })
  }
  list.sort((a, b) => a.key.localeCompare(b.key))
  return list
}

defineMock([
  // 全量词条（公开读取，运行时合并用）
  {
    method: 'get',
    path: '/i18n',
    handler: () => allEntries(),
  },
  // 保存/覆盖词条（运营端）
  {
    method: 'post',
    path: '/i18n',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { key, zh, en } = (ctx.body ?? {}) as { key?: string; zh?: string; en?: string }
      if (!key) throw new MockError('词条 Key 不能为空', 1001)
      const over = readOverrides()
      over[key] = { zh: String(zh ?? ''), en: String(en ?? '') }
      writeOverrides(over)
      return { key, zh: over[key].zh, en: over[key].en, isOverride: true } as I18nEntry
    },
  },
  // 删除词条覆盖（运营端）
  {
    method: 'delete',
    path: '/i18n/:key',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const over = readOverrides()
      delete over[decodeURIComponent(ctx.params.key)]
      writeOverrides(over)
      return { ok: true }
    },
  },
])
